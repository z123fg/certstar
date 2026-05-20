import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

interface PageHeaderProps {
    showBack?: boolean;
}

export default function PageHeader({ showBack }: PageHeaderProps) {
    const navigate = useNavigate();

    return (
        <Box
            component="header"
            sx={{ bgcolor: "primary.main", color: "#fff", py: 2, px: 2.5, display: "flex", alignItems: "center" }}
        >
            <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
                {showBack && (
                    <Button
                        size="small"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate("/")}
                        sx={{ color: "#fff", textTransform: "none" }}
                    >
                        返回证书搜索页面
                    </Button>
                )}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: "0.05em" }}>
                证书查询
            </Typography>
            <Box sx={{ flex: 1 }} />
        </Box>
    );
}
