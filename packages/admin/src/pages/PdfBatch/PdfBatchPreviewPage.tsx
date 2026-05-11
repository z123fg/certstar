import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, IconButton, LinearProgress, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import UploadIcon from "@mui/icons-material/Upload";
import { certTypeMap } from "@certstar/shared";
import { useAppContext } from "../../App";
import { createMany } from "../../services/cert";
import type { Cert } from "../../types";
import { OssUploadError, ossErrorMessage, dbErrorMessage, uploadObject } from "../../utils/ossUtils";
import { validateCertDraft } from "../../utils/certValidation";
import { usePdfBatchContext } from "./PdfBatchContext";

interface Props {
  token: string | null;
}

type Step = "preview" | "processing" | "done";

export default function PdfBatchPreviewPage({ token }: Props) {
  const navigate = useNavigate();
  const { refreshCerts } = useAppContext();
  const { rows, setRows, pdfMap, setPdfMap } = usePdfBatchContext();

  const [step, setStep] = useState<Step>("preview");
  const [progress, setProgress] = useState(0);
  const [processingMsg, setProcessingMsg] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const [pageAlert, setPageAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  if (rows.length === 0 && step === "preview") {
    return (
      <Box sx={{ p: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "center", alignSelf: "flex-start" }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/pdf-batch/upload")} size="small">返回</Button>
          <Typography variant="h6">PDF 证书录入</Typography>
        </Stack>
        <Typography color="text.secondary">没有可预览的数据，请先上传 CSV 文件。</Typography>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate("/pdf-batch/upload")}>去上传</Button>
      </Box>
    );
  }

  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  const validate = (): boolean => {
    // Field validation
    const invalidRows = rows.flatMap((row, i) => {
      const errors = validateCertDraft(row);
      return errors.length > 0 ? [`第 ${i + 1} 行（${row.idNum}）：${errors.join("，")}`] : [];
    });
    if (invalidRows.length > 0) {
      setPageAlert({ type: "error", message: `${invalidRows.length} 条数据校验失败：${invalidRows.join("；")}` });
      return false;
    }
    // PDF presence check
    const missingPdfs = rows.filter((row) => !pdfMap.has(row.certNum)).map((row) => row.certNum);
    if (missingPdfs.length > 0) {
      setPageAlert({ type: "error", message: `以下证书缺少对应 PDF 文件：${missingPdfs.join("、")}` });
      return false;
    }
    setPageAlert(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setProgress(0);
    setStep("processing");

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    const payloads = new Array<Omit<Cert, "id" | "createdAt" | "updatedAt">>(rows.length);
    try {
      setProcessingMsg(`正在上传 PDF 0 / ${rows.length}...`);
      await Promise.all(
        rows.map(async ({ _localId: _, ...draft }, i) => {
          const pdfFile = pdfMap.get(draft.certNum)!;
          const filename = `cert-image/${draft.certNum}.pdf`;
          await uploadObject(filename, "application/pdf", pdfFile, signal);
          const certImageUrl = `${import.meta.env.VITE_OSS_BASE_URL}/${filename}`;
          setProgress((p) => {
            const next = p + 1;
            setProcessingMsg(`正在上传 PDF ${next} / ${rows.length}...`);
            return next;
          });
          payloads[i] = { ...draft, certImageUrl } as Omit<Cert, "id" | "createdAt" | "updatedAt">;
        })
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPageAlert({ type: "error", message: err instanceof OssUploadError ? ossErrorMessage(err) : "PDF 上传失败，请检查网络后重试" });
      setStep("preview");
      return;
    }

    if (signal.aborted) return;

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
    setPageAlert({ type: "success", message: `成功录入 ${payloads.length} 条证书` });
    setStep("done");
  };

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "center", alignSelf: "flex-start" }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/pdf-batch/upload")}
          size="small"
          disabled={step === "processing"}
        >
          返回上传
        </Button>
        <Typography variant="h6">PDF 证书录入</Typography>
      </Stack>

      {pageAlert && (
        <Alert severity={pageAlert.type} onClose={() => setPageAlert(null)} sx={{ mb: 2, width: "100%" }}>
          {pageAlert.message}
        </Alert>
      )}

      {step === "preview" && (
        <Box sx={{ width: "100%" }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
              共 {rows.length} 条，{pdfMap.size} 个 PDF
            </Typography>
            <Button variant="outlined" onClick={() => navigate("/pdf-batch/upload")}>重新选择文件</Button>
            <Button variant="contained" startIcon={<UploadIcon />} disabled={rows.length === 0} onClick={handleSubmit}>
              录入（{rows.length} 条）
            </Button>
          </Stack>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: "calc(100vh - 220px)" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {["姓名", "身份证号", "证书编号", "有效期至", "证书类型", "PDF", "操作"].map((h, i) => (
                    <TableCell key={i} sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={row._localId}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{row.idNum}</TableCell>
                    <TableCell>{row.certNum}</TableCell>
                    <TableCell>{row.expDate}</TableCell>
                    <TableCell>{certTypeMap[row.certType] ?? row.certType}</TableCell>
                    <TableCell align="center">
                      {pdfMap.has(row.certNum)
                        ? <CheckCircleIcon fontSize="small" color="success" />
                        : <ErrorOutlinedIcon fontSize="small" color="error" />}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => navigate(`/pdf-batch/draft/${encodeURIComponent(row._localId)}/edit`)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => removeRow(i)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {step === "processing" && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{processingMsg}</Typography>
          <LinearProgress
            variant="determinate"
            value={rows.length > 0 ? (progress / rows.length) * 100 : 0}
            sx={{ width: 480, maxWidth: "100%", borderRadius: 1 }}
          />
          <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
            {progress} / {rows.length} 完成
          </Typography>
          <Button variant="outlined" color="error" onClick={handleCancel} sx={{ mt: 4 }}>取消</Button>
        </Box>
      )}

      {step === "done" && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 3 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 56 }} />
          <Typography variant="h6">成功录入 {successCount} 条证书</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => navigate("/")}>返回列表</Button>
            <Button variant="outlined" onClick={() => { setRows([]); setPdfMap(new Map()); navigate("/pdf-batch/upload"); }}>继续录入</Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
