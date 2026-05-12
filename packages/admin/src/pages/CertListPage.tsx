import { useNavigate } from "react-router-dom";
import {
    Box,
    Button,
    Card,
    CardContent,
    FormControlLabel,
    Switch,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CertTable from "../components/CertTable/CertTable";
import { useAppContext } from "../App";
import { deleteMany } from "../services/cert";
import intl from "../intl/intl";

interface Props {
    token: string | null;
}

export default function CertListPage({ token }: Props) {
    const navigate = useNavigate();
    const {
        certs,
        refreshCerts,
        setAlert,
        showBackdrop,
        complianceMode,
        setComplianceMode,
    } = useAppContext();

    if (!token) {
        return (
            <Typography color="text.secondary" sx={{ m: 4 }}>
                {intl.notLoggedIn}
            </Typography>
        );
    }

    const handleBatchDelete = async (ids: string[]) => {
        showBackdrop(true);
        try {
            await deleteMany(ids);
            await refreshCerts();
            setAlert({
                type: "success",
                message: `已删除 ${ids.length} 条证书`,
            });
        } catch {
            setAlert({ type: "error", message: intl.deleteError });
        } finally {
            showBackdrop(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                <Card elevation={2}>
                    <CardContent
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                            p: "50px",
                            "&:last-child": { pb: "50px" },
                        }}
                    >
                        <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => navigate("/certs/new")}
                            >
                                {intl.addOne}
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<UploadFileIcon />}
                                onClick={() => navigate("/batch")}
                            >
                                {intl.addMany}
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<PictureAsPdfIcon />}
                                onClick={() => navigate("/pdf-batch")}
                            >
                                {intl.pdfBatchEntry}
                            </Button>
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 0.5,
                            }}
                        >
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={complianceMode}
                                        onChange={(e) =>
                                            setComplianceMode(e.target.checked)
                                        }
                                        color="warning"
                                    />
                                }
                                label={intl.complianceMode}
                            />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ maxWidth: 360, textAlign: "center" }}
                            >
                                {intl.complianceModeDesc}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
            <CertTable certs={certs} onBatchDelete={handleBatchDelete} />
        </Box>
    );
}
