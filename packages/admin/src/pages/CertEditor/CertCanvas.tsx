import { Box, Typography } from "@mui/material";
import type { Cert } from "../../types";
import { useCertCanvas } from "./useCertCanvas";
import intl from "../../intl/intl";

interface Props {
    cert: Partial<Cert>;
    profileImageDataUrl: string;
    onReady?: () => void;
    onLoading?: (loading: boolean) => void;
}

export default function CertCanvas({ cert, profileImageDataUrl, onReady, onLoading }: Props) {
    useCertCanvas(cert, profileImageDataUrl, onReady, onLoading);

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                p: 2,
            }}
        >
            <canvas
                id="main-canvas"
                style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 4,
                    display: "block",
                }}
            />
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
            >
                {intl.ctrlMultiSelect}
            </Typography>
        </Box>
    );
}
