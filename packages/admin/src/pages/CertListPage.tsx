import { useNavigate } from "react-router-dom";
import { Box, Button, Card, CardContent, FormControlLabel, Switch, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CertTable from "../components/CertTable/CertTable";
import { useAppContext } from "../App";
import { deleteMany } from "../services/cert";

interface Props {
  token: string | null;
}

export default function CertListPage({ token }: Props) {
  const navigate = useNavigate();
  const { certs, refreshCerts, setAlert, showBackdrop, complianceMode, setComplianceMode } = useAppContext();

  if (!token) {
    return <Typography color="text.secondary" sx={{ m: 4 }}>请先登录。</Typography>;
  }

  const handleBatchDelete = async (ids: string[]) => {
    showBackdrop(true);
    try {
      await deleteMany(ids);
      await refreshCerts();
      setAlert({ type: "success", message: `已删除 ${ids.length} 条证书` });
    } catch {
      setAlert({ type: "error", message: "删除失败，请重试" });
    } finally {
      showBackdrop(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
        <Card elevation={2}>
          <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, p: "50px", "&:last-child": { pb: "50px" } }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/certs/new")}>
                添加证书
              </Button>
              <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => navigate("/batch")}>
                批量添加
              </Button>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={complianceMode}
                  onChange={(e) => setComplianceMode(e.target.checked)}
                  color="warning"
                />
              }
              label="完全合规模式"
            />
          </CardContent>
        </Card>
      </Box>
      <CertTable certs={certs} onBatchDelete={handleBatchDelete} />
    </Box>
  );
}
