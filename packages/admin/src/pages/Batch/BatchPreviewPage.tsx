import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Chip, IconButton, LinearProgress, Paper, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import { certTypeMap } from "@certstar/shared";
import { useAppContext } from "../../App";
import { createMany } from "../../services/cert";
import { getUploadUrl } from "../../services/sts";
import type { Cert, CertDraft } from "../../types";
import {
  exportCanvasAsDataUrl, getSnapshotLayout, initCanvas, destroyCanvas,
  loadTemplate, renderProfileImage, renderQRCode, renderTextFields,
} from "../../utils/canvasUtils";
import { validateCertDraft } from "../../utils/certValidation";
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

// Structured error for OSS upload failures — carries the filename and HTTP status if available
class OssUploadError extends Error {
  constructor(public readonly filename: string, public readonly status?: number) {
    super(status ? `HTTP ${status} uploading ${filename}` : `Network error uploading ${filename}`);
    this.name = "OssUploadError";
  }
}

const uploadObject = async (filename: string, mimeType: string, blob: Blob, signal?: AbortSignal) => {
  let res: Response;
  try {
    res = await fetch(await getUploadUrl(filename, mimeType), {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": mimeType },
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err; // let abort propagate as-is
    throw new OssUploadError(filename);                  // network-level failure
  }
  if (!res.ok) throw new OssUploadError(filename, res.status);
};

// Human-readable message for an OSS upload failure
const ossErrorMessage = (err: OssUploadError): string => {
  const file = err.filename.split("/").pop() ?? err.filename;
  if (!err.status) return `上传 ${file} 时网络连接失败，请检查网络后重试`;
  if (err.status === 403) return `上传 ${file} 被拒绝（权限不足），请联系管理员`;
  if (err.status >= 500) return `上传 ${file} 时服务器错误（${err.status}），请稍后重试`;
  return `上传 ${file} 失败（${err.status}），请重试`;
};

// Human-readable message for a DB write failure (axios error)
const dbErrorMessage = (err: unknown): string => {
  const status = (err as any)?.response?.status as number | undefined;
  const serverMsg = (err as any)?.response?.data?.message as string | undefined;
  if (status === 409) return "部分证书已存在于数据库中，请检查是否重复提交";
  if (status === 400) return serverMsg ? `数据格式错误：${serverMsg}` : "数据格式错误，请检查后重试";
  if (status && status >= 500) return `服务器内部错误（${status}），请稍后重试`;
  if (!status) return "网络连接失败，请检查网络后重试";
  return `写入数据库失败（${status}），请重试`;
};

export default function BatchPreviewPage({ token }: Props) {
  const navigate = useNavigate();
  const { refreshCerts } = useAppContext();
  const { rows, setRows, rowLayouts, profileDataUrlOverrides, imageMap } = useBatchContext();

  const [step, setStep] = useState<Step>("preview");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [processingMsg, setProcessingMsg] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const [pageAlert, setPageAlert] = useState<PageAlert | null>(null);

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

  const handleSubmit = async () => {
    // Pre-flight validation — check every row before touching canvas or network
    const invalidRows = rows.flatMap((row, i) => {
      const errors = validateCertDraft(row);
      return errors.length > 0 ? [`第 ${i + 1} 行（${row.idNum}）：${errors.join("，")}`] : [];
    });
    if (invalidRows.length > 0) {
      setPageAlert({
        type: "error",
        message: `${invalidRows.length} 条数据校验失败，请修正后重试：${invalidRows.join("；")}`,
      });
      return;
    }

    setPageAlert(null);
    // total = rows.length (render phase) + rows.length (upload phase)
    setTotal(rows.length * 2);
    setProgress(0);
    setStep("processing");

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    // Phase 1 — render each cert image sequentially (canvas is a singleton)
    const rendered: Rendered[] = [];
    const renderFailed: string[] = [];

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
        await loadTemplate(draft.certType, "stamped");
        renderTextFields({ ...draft, ...savedLayout } as Partial<Cert>);
        if (profileDataUrl) await renderProfileImage(profileDataUrl, savedLayout as Partial<Cert>);
        await renderQRCode(draft.idNum, draft.certNum);

        const certBlob = await fetch(exportCanvasAsDataUrl()).then((r) => r.blob());
        rendered.push({ draft, certBlob, profileDataUrl, layout: savedLayout ?? getSnapshotLayout() });
      } catch {
        renderFailed.push(draft.certNum);
      }
      setProgress(i + 1);
      setProcessingMsg(`正在生成证书图片 ${i + 1} / ${rows.length}...`);
    }

    destroyCanvas();

    if (signal.aborted) return;

    if (renderFailed.length > 0) {
      setPageAlert({
        type: "error",
        message: `${renderFailed.length} 条证书图片生成失败，请检查对应数据后重试：${renderFailed.join("、")}`,
      });
      setStep("preview");
      return;
    }

    // Phase 2 — upload all rendered items concurrently
    // No try/catch inside each callback — let any failure propagate to abort Promise.all
    let uploadedCount = 0;
    setProcessingMsg(`正在上传图片 0 / ${rendered.length}...`);
    const payloads: Omit<Cert, "id" | "createdAt" | "updatedAt">[] = [];
    try {
      await Promise.all(
        rendered.map(async ({ draft, certBlob, profileDataUrl, layout }) => {
          const certFilename = `cert-image/${draft.certNum}.png`;
          await uploadObject(certFilename, "image/png", certBlob, signal);

          let profileImageUrl: string | undefined;
          if (profileDataUrl) {
            const profileBlob = await fetch(profileDataUrl, { signal }).then((r) => r.blob());
            const profileFilename = `profile-image/${draft.idNum}.jpg`;
            await uploadObject(profileFilename, "image/jpeg", profileBlob, signal);
            profileImageUrl = profileFilename;
          }

          uploadedCount += 1;
          setProgress(rows.length + uploadedCount);
          setProcessingMsg(`正在上传图片 ${uploadedCount} / ${rendered.length}...`);

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _localId, ...draftWithoutLocalId } = draft;
          payloads.push({
            ...draftWithoutLocalId,
            certImageUrl: certFilename,
            ...(profileImageUrl ? { profileImageUrl } : {}),
            ...layout,
          } as Omit<Cert, "id" | "createdAt" | "updatedAt">);
        })
      );
    } catch (err) {
      // User navigated away or clicked cancel — skip all state updates
      if ((err as Error).name === "AbortError") return;
      // At least one upload failed — do not touch DB, return to preview for retry
      setPageAlert({
        type: "error",
        message: err instanceof OssUploadError ? ossErrorMessage(err) : "图片上传失败，请检查网络后重试",
      });
      setStep("preview");
      return;
    }

    // All uploads succeeded — safe to write to DB
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
            <Button variant="contained" disabled={rows.length === 0} onClick={handleSubmit}>
              开始生成并上传（{rows.length} 条）
            </Button>
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
                      <TableCell>{certTypeMap[row.certType]}</TableCell>
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
                          <IconButton size="small" onClick={() => navigate(`/batch/draft/${i}/edit`)}>
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
            取消上传
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
