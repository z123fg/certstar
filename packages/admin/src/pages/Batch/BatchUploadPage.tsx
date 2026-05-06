import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { parseCertCsv } from "../../utils/csvUtils";
import { useBatchContext } from "./BatchContext";

interface Props {
  token: string | null;
}

export default function BatchUploadPage({ token }: Props) {
  const navigate = useNavigate();
  const { rows, setRows, setRowLayouts, setProfileDataUrlOverrides, imageMap, setImageMap } =
    useBatchContext();

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  if (!token) {
    return <Typography color="text.secondary" sx={{ m: 4 }}>请先登录。</Typography>;
  }

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
      setRowLayouts(new Map());
      setProfileDataUrlOverrides(new Map());
      navigate("/batch/preview");
    }
  };

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "center", alignSelf: "flex-start" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/")} size="small">返回</Button>
        <Typography variant="h6">批量添加证书</Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 3, width: "100%", maxWidth: 720 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>CSV 文件</Typography>
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            />
            <label htmlFor="csv-input">
              <Button variant="outlined" component="span" size="small" startIcon={<UploadFileIcon />}>
                {csvFile ? csvFile.name : "选择文件"}
              </Button>
            </label>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              必须包含列：name, idNum, organization, certNum, expDate, issuingAgency, certType
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              照片文件（文件名为身份证号，可多选）
            </Typography>
            <input
              id="images-input"
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handleImagesChange}
            />
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

          <Stack direction="row" spacing={1}>
            <Button variant="contained" disabled={!csvFile} onClick={handleParse}>
              解析预览
            </Button>
            {rows.length > 0 && (
              <Button variant="outlined" onClick={() => navigate("/batch/preview")}>
                返回预览
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
