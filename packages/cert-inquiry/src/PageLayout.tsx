import Box from "@mui/material/Box";
import PageHeader from "./PageHeader";

interface PageLayoutProps {
    children: React.ReactNode;
    maxWidth?: number;
}

export default function PageLayout({ children, maxWidth = 600 }: PageLayoutProps) {
    return (
        <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <PageHeader />
            <Box
                component="main"
                sx={{ flex: 1, px: 2, py: 5, maxWidth, mx: "auto", width: "100%" }}
            >
                {children}
            </Box>
        </Box>
    );
}
