import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function PageHeader() {
    return (
        <Box
            component="header"
            sx={{ bgcolor: "primary.main", color: "#fff", py: 2, px: 2.5, textAlign: "center" }}
        >
            <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: "0.05em" }}>
                证书查询
            </Typography>
        </Box>
    );
}
