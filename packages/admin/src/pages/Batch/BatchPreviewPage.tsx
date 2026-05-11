import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Chip, IconButton, LinearProgress, Menu, MenuItem, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import JSZip from "jszip";
import { certTypeMap } from "@certstar/shared";
import { useAppContext } from "../../App";
import { createMany } from "../../services/cert";
import type { Cert, CertDraft } from "../../types";
import {
  exportCanvasAsDataUrl, getSnapshotLayout, initCanvas, destroyCanvas,
  loadFonts, loadTemplate, renderProfileImage, renderQRCode, renderTextFields,
  triggerBlobDownload, type CertVariant,
} from "../../utils/canvasUtils";
import { validateCertDraft } from "../../utils/certValidation";
import { OssUploadError, ossErrorMessage, dbErrorMessage, uploadObject } from "../../utils/ossUtils";
import { useBatchContext } from "./BatchContext";
import { readFileAsDataUrl } from "./fileUtils";

interface Props {
  token: string | null;
}

interface PageAlert {
  type: "success" | "error";
  message: string;
}

type Step = "preview" | "processing" | "done";

type Rendered = {
  draft: CertDraft;
  certBlob: Blob;
  profileDataUrl: string;
  layout: Partial<Cert>;
};


export default function BatchPreviewPage({ token }: Props) {
  const navigate = useNavigate();
  const { refreshCerts, complianceMode } = useAppContext();
  const { rows, setRows, rowLayouts, profileDataUrlOverrides, imageMap } = useBatchContext();

  const [step, setStep] = useState<Step>("preview");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [processingMsg, setProcessingMsg] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const [pageAlert, setPageAlert] = useState<PageAlert | null>(null);
  const [downloadAnchor, setDownloadAnchor] = useState<HTMLElement | null>(null);

  // Abort controller — cancelled on unmount or explicit user cancel
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStep("preview");
  };

  if (!token) {
    return <Typography color="text.secondary" sx={{ m: 4 }}>请先登录。</Typography>;
  }

  // Guard: nothing to preview yet
  if (rows.length === 0 && step === "preview") {
    return (
      <Box sx={{ p: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "center", alignSelf: "flex-start" }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/batch/upload")} size="small">返回</Button>
          <Typography variant="h6">批量添加证书</Typography>
        </Stack>
        <Typography color="text.secondary">没有可预览的数据，请先上传 CSV 文件。</Typography>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate("/batch/upload")}>
          去上传
        </Button>
      </Box>
    );
  }

  const removeRow = (index: number) =>
    setRows((prev) => prev.filter((_, i) => i !== index));

  // ── Shared: pre-flight validation ─────────────────────────────────────────
  const validate = (): boolean => {
    const invalidRows = rows.flatMap((row, i) => {
      const errors = validateCertDraft(row);
      return errors.length > 0 ? [`第 ${i + 1} 行（${row.idNum}）：${errors.join("，")}`] : [];
    });
    if (invalidRows.length > 0) {
      setPageAlert({
        type: "error",
        message: `${invalidRows.length} 条数据校验失败，请修正后重试：${invalidRows.join("；")}`,
      });
      return false;
    }
    setPageAlert(null);
    return true;
  };

  // ── Shared: render all certs sequentially on the singleton canvas ──────────
  const renderPhase = async (signal: AbortSignal, variant: CertVariant): Promise<{ rendered: Rendered[]; failed: string[] }> => {
    const rendered: Rendered[] = [];
    const failed: string[] = [];
    await loadFonts();
    setProcessingMsg(`正在生成证书图片 0 / ${rows.length}...`);
    for (let i = 0; i < rows.length; i++) {
      if (signal.aborted) break;
      const draft = rows[i];
      try {
        const profileFile = imageMap.get(draft.idNum);
        const profileDataUrl =
          profileDataUrlOverrides.get(draft._localId) ??
          (profileFile ? await readFileAsDataUrl(profileFile) : "");
        const savedLayout = rowLayouts.get(draft._localId);
        initCanvas("batch-canvas");
        await loadTemplate(draft.certType, variant);
        renderTextFields({ ...draft, ...savedLayout } as Partial<Cert>);
        if (profileDataUrl) await renderProfileImage(profileDataUrl, savedLayout as Partial<Cert>);
        await renderQRCode(draft.idNum, draft.certNum);
        const certBlob = await fetch(exportCanvasAsDataUrl()).then((r) => r.blob());
        rendered.push({ draft, certBlob, profileDataUrl, layout: savedLayout ?? getSnapshotLayout() });
      } catch (err) {
        if ((err as Error).name === "AbortError") break;
        failed.push(draft.certNum);
      }
      setProgress(i + 1);
      setProcessingMsg(`正在生成证书图片 ${i + 1} / ${rows.length}...`);
    }
    destroyCanvas();
    return { rendered, failed };
  };

  // ── Upload + save to DB ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setTotal(rows.length * 2); // render phase (rows.length steps) + upload phase (rows.length steps)
    setProgress(0);
    setStep("processing");

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    const { rendered, failed } = await renderPhase(signal, "stamped");
    if (signal.aborted) return;
    if (failed.length > 0) {
      setPageAlert({ type: "error", message: `${failed.length} 条证书图片生成失败，请检查对应数据后重试：${failed.join("、")}` });
      setStep("preview");
      return;
    }

    setProcessingMsg(`正在上传图片 0 / ${rendered.length}...`);
    const payloads = new Array<Omit<Cert, "id" | "createdAt" | "updatedAt">>(rendered.length);
    try {
      await Promise.all(
        rendered.map(async ({ draft, certBlob, profileDataUrl, layout }, i) => {
          const certFilename = `cert-image/${draft.certNum}.pdf`;
          await uploadObject(certFilename, "application/pdf", certBlob, signal);
          const certImageUrl = `${import.meta.env.VITE_OSS_BASE_URL}/${certFilename}`;
          let profileImageUrl: string | undefined;
          if (profileDataUrl) {
            const profileBlob = await fetch(profileDataUrl, { signal }).then((r) => r.blob());
            const profileFilename = `profile-image/${draft.idNum}.jpg`;
            await uploadObject(profileFilename, "image/jpeg", profileBlob, signal);
            profileImageUrl = `${import.meta.env.VITE_OSS_BASE_URL}/${profileFilename}`;
          }
          setProgress((p) => {
            const next = p + 1;
            setProcessingMsg(`正在上传图片 ${next - rows.length} / ${rendered.length}...`);
            return next;
          });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _localId, ...draftWithoutLocalId } = draft;
          payloads[i] = {
            ...draftWithoutLocalId,
            certImageUrl,
            ...(profileImageUrl ? { profileImageUrl } : {}),
            ...layout,
          } as Omit<Cert, "id" | "createdAt" | "updatedAt">;
        })
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPageAlert({ type: "error", message: err instanceof OssUploadError ? ossErrorMessage(err) : "图片上传失败，请检查网络后重试" });
      setStep("preview");
      return;
    }

    try {
      await createMany(payloads);
      await refreshCerts();
      setSuccessCount(payloads.length);
    } catch (err) {
      setPageAlert({ type: "error", message: dbErrorMessage(err) });
      setStep("preview");
      return;
    }

    abortRef.current = null;
    setPageAlert({ type: "success", message: `成功上传 ${payloads.length} 条证书` });
    setStep("done");
  };

  // ── Download as ZIP ────────────────────────────────────────────────────────
  const handleDownloadZip = async (variant: CertVariant) => {
    setDownloadAnchor(null);
    if (!validate()) return;
    setTotal(rows.length);
    setProgress(0);
    setStep("processing");

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    const { rendered, failed } = await renderPhase(signal, variant);
    abortRef.current = null;
    if (signal.aborted) return;
    if (failed.length > 0) {
      setPageAlert({ type: "error", message: `${failed.length} 条证书图片生成失败：${failed.join("、")}` });
      setStep("preview");
      return;
    }

    const zip = new JSZip();
    rendered.forEach(({ draft, certBlob }) => zip.file(`${draft.certNum}.pdf`, certBlob));
    triggerBlobDownload(await zip.generateAsync({ type: "blob" }), "certificates.zip");
    setStep("preview");
  };

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Outer div stays fixed off-screen; fabric.js inserts its wrapper div inside it */}
      <div
        aria-hidden="true"
        style={{ position: "fixed", left: "-99999px", top: "-99999px", overflow: "hidden" }}
      >
        <canvas id="batch-canvas" />
      </div>

      <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "center", alignSelf: "flex-start" }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/batch/upload")}
          size="small"
          disabled={step === "processing"}
        >
          返回上传
        </Button>
        <Typography variant="h6">批量添加证书</Typography>
      </Stack>

      {pageAlert && (
        <Alert
          severity={pageAlert.type}
          onClose={() => setPageAlert(null)}
          sx={{ mb: 2, width: "100%", maxWidth: step === "preview" ? "none" : 720 }}
        >
          {pageAlert.message}
        </Alert>
      )}

      {step === "preview" && (
        <Box sx={{ width: "100%" }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
              共 {rows.length} 条，{imageMap.size} 张照片
            </Typography>
            <Button variant="outlined" onClick={() => navigate("/batch/upload")}>
              重新选择文件
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              disabled={rows.length === 0}
              onClick={(e) => setDownloadAnchor(e.currentTarget)}
            >
              下载 ZIP（{rows.length} 条）
            </Button>
            <Menu anchorEl={downloadAnchor} open={Boolean(downloadAnchor)} onClose={() => setDownloadAnchor(null)}>
              <Tooltip title={complianceMode ? "当前模式不允许下载有章证书" : ""} placement="left">
                <span>
                  <MenuItem disabled={complianceMode} onClick={() => handleDownloadZip("stamped")}>带章版</MenuItem>
                </span>
              </Tooltip>
              <MenuItem onClick={() => handleDownloadZip("stampless")}>无章版</MenuItem>
            </Menu>
            <Tooltip title={complianceMode ? "当前模式不允许上传有章证书" : ""}>
              <span>
                <Button variant="contained" disabled={rows.length === 0 || complianceMode} onClick={handleSubmit}>
                  生成并上传（{rows.length} 条）
                </Button>
              </span>
            </Tooltip>
          </Stack>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: "calc(100vh - 220px)" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {["姓名", "身份证号", "证书编号", "有效期至", "证书类型", "照片", "布局", "操作"].map((h, i) => (
                    <TableCell key={i} sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, i) => {
                  const hasCustomLayout = rowLayouts.has(row._localId);
                  return (
                    <TableRow key={row._localId}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{row.idNum}</TableCell>
                      <TableCell>{row.certNum}</TableCell>
                      <TableCell>{row.expDate}</TableCell>
                      <TableCell>{certTypeMap[row.certType] ?? row.certType}</TableCell>
                      <TableCell align="center">
                        {imageMap.has(row.idNum)
                          ? <CheckCircleIcon fontSize="small" color="success" />
                          : <Typography variant="caption" color="text.disabled">-</Typography>}
                      </TableCell>
                      <TableCell>
                        {hasCustomLayout && (
                          <Chip
                            label="已调整"
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ height: 18, fontSize: 10 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => navigate(`/batch/draft/${encodeURIComponent(row._localId)}/edit`)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => removeRow(i)}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {step === "processing" && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {processingMsg}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={total > 0 ? (progress / total) * 100 : 0}
            sx={{ width: 480, maxWidth: "100%", borderRadius: 1 }}
          />
          <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
            {progress} / {total} 步骤完成
          </Typography>
          <Button variant="outlined" color="error" onClick={handleCancel} sx={{ mt: 4 }}>
            取消
          </Button>
        </Box>
      )}

      {step === "done" && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 3 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 56 }} />
          <Typography variant="h6">成功上传 {successCount} 条证书</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => navigate("/")}>返回列表</Button>
            <Button variant="outlined" onClick={() => navigate("/batch/upload")}>继续批量添加</Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
