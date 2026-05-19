import Box from "@mui/material/Box";
import PageHeader from "./PageHeader";
import bg from "./assets/bg.png";

interface PageLayoutProps {
    children: React.ReactNode;
    maxWidth?: number;
    py?: number | string;
}

export default function PageLayout({ children, maxWidth = 600, py = 5 }: PageLayoutProps) {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                backgroundImage: `url(${bg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
            }}
        >
            <PageHeader />
            <Box
                component="main"
                sx={{ flex: 1, p: "10px", py, maxWidth, mx: "auto", width: "100%", position: "relative" }}
            >
                {children}
            </Box>
        </Box>
    );
}
