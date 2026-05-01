import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CertTable from "../components/CertTable/CertTable";
import UploadListDialog from "../components/UploadListDialog/UploadListDialog";
import { useAppContext } from "../App";

interface Props {
  token: string | null;
}

export default function CertListPage({ token }: Props) {
  const navigate = useNavigate();
  const { certs } = useAppContext();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  if (!token) {
    return <Typography color="text.secondary" sx={{ m: 4 }}>请先登录。</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/certs/new")}>
          添加证书
        </Button>
        <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setIsUploadOpen(true)}>
          批量添加
        </Button>
      </Box>
      <CertTable certs={certs} />
      <UploadListDialog open={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </Box>
  );
}
