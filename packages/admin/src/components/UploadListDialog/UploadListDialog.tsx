import { useState, useEffect, type ChangeEvent } from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, IconButton, LinearProgress, MenuItem, Paper, Select,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
import { certTypeMap } from "@certstar/shared";
import { useAppContext } from "../../App";
import { parseCertCsv } from "../../utils/csvUtils";
import {
  initCanvas, destroyCanvas, loadTemplate, renderTextFields,
  renderProfileImage, renderQRCode, exportCanvasAsDataUrl, getSnapshotLayout,
} from "../../utils/canvasUtils";
import { getUploadUrl } from "../../services/sts";
import { createMany } from "../../services/cert";
import type { Cert, CertDraft } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = "upload" | "preview" | "processing" | "done";

interface EditingState {
  index: number;
  draft: CertDraft;
  savedLayout: Partial<Cert> | undefined;
  profileDataUrl: string;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function UploadListDialog({ open, onClose }: Props) {
  const { setAlert, refreshCerts } = useAppContext();

  const [step, setStep] = useState<Step>("upload");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageMap, setImageMap] = useState<Map<string, File>>(new Map());
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [rows, setRows] = useState<CertDraft[]>([]);
  const [rowLayouts, setRowLayouts] = useState<Map<string, Partial<Cert>>>(new Map());
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedIds, setFailedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!editingState) return;
    const { draft, savedLayout, profileDataUrl } = editingState;
    (async () => {
      initCanvas("layout-editor-canvas");
      await loadTemplate(draft.certType);
      renderTextFields({ ...draft, ...savedLayout } as Partial<Cert>);
      if (profileDataUrl) await renderProfileImage(profileDataUrl, savedLayout as Partial<Cert>);
      await renderQRCode(draft.idNum, draft.certNum);
    })();
    return () => { destroyCanvas(); };
  }, [editingState]);

  const handleImagesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const map = new Map<string, File>();
    files.forEach((f) => map.set(f.name.replace(/\.[^.]+$/, ""), f));
    setImageMap(map);
  };

  const handleParse = async () => {
    if (!csvFile) return;
    const text = await csvFile.text();
    const { rows: parsed, errors } = parseCertCsv(text);
    setParseErrors(errors);
    if (parsed.length > 0) {
      setRows(parsed);
      setStep("preview");
    }
  };

  const updateRow = (index: number, patch: Partial<CertDraft>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const removeRow = (index: number) =>
    setRows((prev) => prev.filter((_, i) => i !== index));

  const openLayoutEditor = async (index: number) => {
    const draft = rows[index];
    const savedLayout = rowLayouts.get(draft._localId);
    const profileFile = imageMap.get(draft.idNum);
    const profileDataUrl = profileFile ? await readFileAsDataUrl(profileFile) : "";
    setEditingState({ index, draft, savedLayout, profileDataUrl });
  };

  const saveLayout = () => {
    if (!editingState) return;
    const layout = getSnapshotLayout();
    setRowLayouts((prev) => new Map(prev).set(editingState.draft._localId, layout));
    destroyCanvas();
    setEditingState(null);
  };

  const cancelLayoutEdit = () => {
    destroyCanvas();
    setEditingState(null);
  };

  const handleSubmit = async () => {
    setStep("processing");
    setTotal(rows.length);
    setProgress(0);

    const payloads: Omit<Cert, "id" | "createdAt" | "updatedAt">[] = [];
    const failed: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const draft = rows[i];
      try {
        const profileFile = imageMap.get(draft.idNum);
        const profileDataUrl = profileFile ? await readFileAsDataUrl(profileFile) : "";
        const savedLayout = rowLayouts.get(draft._localId);

        initCanvas("batch-canvas");
        await loadTemplate(draft.certType);
        renderTextFields({ ...draft, ...savedLayout } as Partial<Cert>);
        if (profileDataUrl) await renderProfileImage(profileDataUrl, savedLayout as Partial<Cert>);
        await renderQRCode(draft.idNum, draft.certNum);

        const certBlob = await fetch(exportCanvasAsDataUrl()).then((r) => r.blob());
        const certFilename = `cert-image/${draft.idNum}.png`;
        await fetch(await getUploadUrl(certFilename, "image/png"), {
          method: "PUT", body: certBlob, headers: { "Content-Type": "image/png" },
        });

        let profileImageUrl: string | undefined;
        if (profileDataUrl) {
          const profileBlob = await fetch(profileDataUrl).then((r) => r.blob());
          const profileFilename = `profile-image/${draft.idNum}.jpg`;
          await fetch(await getUploadUrl(profileFilename, "image/jpeg"), {
            method: "PUT", body: profileBlob, headers: { "Content-Type": "image/jpeg" },
          });
          profileImageUrl = profileFilename;
        }

        payloads.push({
          ...draft,
          certImageUrl: certFilename,
          ...(profileImageUrl ? { profileImageUrl } : {}),
          ...(savedLayout ?? getSnapshotLayout()),
        } as Omit<Cert, "id" | "createdAt" | "updatedAt">);
      } catch {
        failed.push(draft.idNum);
      }
      setProgress(i + 1);
    }

    destroyCanvas();

    let saved = 0;
    if (payloads.length > 0) {
      try {
        await createMany(payloads);
        await refreshCerts();
        saved = payloads.length;
      } catch {
        setAlert({ type: "error", message: "批量写入数据库失败" });
        failed.push(...payloads.map((p) => p.idNum));
      }
    }

    setSuccessCount(saved);
    setFailedIds(failed);
    setStep("done");
  };

  const handleClose = () => {
    if (step === "processing") return;
    setStep("upload");
    setCsvFile(null);
    setImageMap(new Map());
    setParseErrors([]);
    setRows([]);
    setRowLayouts(new Map());
    setProgress(0);
    setSuccessCount(0);
    setFailedIds([]);
    onClose();
  };

  return (
    <>
      {/* Layout editor overlay */}
      {editingState && (
        <Box sx={{ position: "fixed", inset: 0, zIndex: 1400, bgcolor: "background.paper", display: "flex", overflow: "hidden" }}>
          <Box sx={{ overflow: "auto", flexShrink: 0, bgcolor: "grey.100", p: 2 }}>
            <canvas id="layout-editor-canvas" />
          </Box>
          <Box sx={{ flex: 1, p: 3, borderLeft: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", gap: 2, minWidth: 200, overflow: "auto" }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>调整布局</Typography>
              <Typography variant="body2">{editingState.draft.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                {editingState.draft.idNum}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              拖拽调整文字和照片的位置，完成后点击保存。
            </Typography>
            <Stack spacing={1} sx={{ mt: "auto" }}>
              <Button variant="contained" onClick={saveLayout}>保存布局</Button>
              <Button variant="outlined" onClick={cancelLayoutEdit}>取消</Button>
            </Stack>
          </Box>
        </Box>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <canvas id="batch-canvas" style={{ position: "fixed", left: "-9999px", top: 0 }} />

        <DialogTitle>批量添加证书</DialogTitle>

        <DialogContent dividers>
          {step === "upload" && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>CSV 文件</Typography>
                <input id="csv-input" type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
                <label htmlFor="csv-input">
                  <Button variant="outlined" component="span" size="small">
                    {csvFile ? csvFile.name : "选择文件"}
                  </Button>
                </label>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  必须包含列：name, idNum, organization, certNum, expDate, issuingAgency, certType
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>照片文件（文件名为身份证号，可多选）</Typography>
                <input id="images-input" type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImagesChange} />
                <label htmlFor="images-input">
                  <Button variant="outlined" component="span" size="small">
                    {imageMap.size > 0 ? `已选 ${imageMap.size} 张` : "选择照片"}
                  </Button>
                </label>
              </Box>
              {parseErrors.length > 0 && (
                <Alert severity="error">
                  {parseErrors.map((e, i) => <div key={i}>{e}</div>)}
                </Alert>
              )}
            </Stack>
          )}

          {step === "preview" && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                共 {rows.length} 条，{imageMap.size} 张照片
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {["姓名","身份证号","单位","证书编号","有效期至","发证机关","证书类型","照片","布局",""].map((h, i) => (
                        <TableCell key={i} sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, i) => {
                      const hasCustomLayout = rowLayouts.has(row._localId);
                      return (
                        <TableRow key={i}>
                          <TableCell><TextField size="small" variant="standard" value={row.name} onChange={(e) => updateRow(i, { name: e.target.value })} slotProps={{ input: { style: { width: 72 } } }} /></TableCell>
                          <TableCell><TextField size="small" variant="standard" value={row.idNum} onChange={(e) => updateRow(i, { idNum: e.target.value })} slotProps={{ input: { style: { width: 140, fontFamily: "monospace" } } }} /></TableCell>
                          <TableCell><TextField size="small" variant="standard" value={row.organization} onChange={(e) => updateRow(i, { organization: e.target.value })} slotProps={{ input: { style: { width: 96 } } }} /></TableCell>
                          <TableCell><TextField size="small" variant="standard" value={row.certNum} onChange={(e) => updateRow(i, { certNum: e.target.value })} slotProps={{ input: { style: { width: 96, fontFamily: "monospace" } } }} /></TableCell>
                          <TableCell><TextField size="small" variant="standard" value={row.expDate} onChange={(e) => updateRow(i, { expDate: e.target.value })} slotProps={{ input: { style: { width: 80 } } }} /></TableCell>
                          <TableCell><TextField size="small" variant="standard" value={row.issuingAgency} onChange={(e) => updateRow(i, { issuingAgency: e.target.value })} slotProps={{ input: { style: { width: 96 } } }} /></TableCell>
                          <TableCell>
                            <FormControl variant="standard" size="small">
                              <Select value={row.certType} onChange={(e) => updateRow(i, { certType: e.target.value as CertDraft["certType"] })} sx={{ fontSize: 12 }}>
                                {Object.entries(certTypeMap).map(([code, label]) => (
                                  <MenuItem key={code} value={code} sx={{ fontSize: 12 }}>{label}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell align="center">
                            {imageMap.has(row.idNum)
                              ? <CheckCircleIcon fontSize="small" color="success" />
                              : <Typography variant="caption" color="text.disabled">—</Typography>}
                          </TableCell>
                          <TableCell>
                            <Tooltip title={hasCustomLayout ? "已自定义，点击重新调整" : "调整布局"}>
                              <IconButton size="small" color={hasCustomLayout ? "primary" : "default"} onClick={() => openLayoutEditor(i)}>
                                <TuneIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {hasCustomLayout && <Chip label="已调整" size="small" color="primary" variant="outlined" sx={{ ml: 0.5, height: 18, fontSize: 10 }} />}
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeRow(i)}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
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
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography variant="body2" sx={{ mb: 2 }}>正在处理第 {progress} / {total} 条…</Typography>
              <LinearProgress variant="determinate" value={total > 0 ? (progress / total) * 100 : 0} />
            </Box>
          )}

          {step === "done" && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1}>
                <Chip label={`成功 ${successCount} 条`} color="success" />
                {failedIds.length > 0 && <Chip label={`失败 ${failedIds.length} 条`} color="error" />}
              </Stack>
              {failedIds.length > 0 && (
                <Alert severity="error">
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>以下记录处理失败：</Typography>
                  {failedIds.map((id, i) => (
                    <Typography key={i} variant="caption" sx={{ display: "block", fontFamily: "monospace" }}>{id}</Typography>
                  ))}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          {step === "upload" && (
            <>
              <Button onClick={handleClose}>取消</Button>
              <Button variant="contained" disabled={!csvFile} onClick={handleParse}>解析预览</Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button onClick={() => setStep("upload")}>返回</Button>
              <Button variant="contained" disabled={rows.length === 0} onClick={handleSubmit}>
                开始生成并上传（{rows.length} 条）
              </Button>
            </>
          )}
          {step === "done" && (
            <Button variant="contained" onClick={handleClose}>关闭</Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
