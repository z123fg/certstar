import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export default function PdfViewer({ url }: { url: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        setDisplaySize(null);

        (async () => {
            try {
                const pdf = await pdfjsLib.getDocument(url).promise;
                if (cancelled) return;
                const page = await pdf.getPage(1);
                if (cancelled) return;

                const canvas = canvasRef.current;
                if (!canvas) return;

                const dpr = window.devicePixelRatio || 1;
                const containerWidth = containerRef.current?.clientWidth ?? 800;
                const maxHeight = window.innerHeight * 0.85;
                const baseViewport = page.getViewport({ scale: 1 });

                // Fit within both container width and 85% of viewport height
                const fitScale = Math.min(
                    containerWidth / baseViewport.width,
                    maxHeight / baseViewport.height,
                );
                const displayWidth = Math.round(fitScale * baseViewport.width);
                const displayHeight = Math.round(fitScale * baseViewport.height);

                // Render at higher resolution than display size to preserve embedded image quality.
                // 4× the base scale captures detail close to a 300dpi embedded image.
                const renderScale = Math.max(fitScale, 4) * dpr;
                const viewport = page.getViewport({ scale: renderScale });

                setDisplaySize({ width: displayWidth, height: displayHeight });

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvas.style.width = `${displayWidth}px`;
                canvas.style.height = `${displayHeight}px`;

                await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
                if (!cancelled) setLoading(false);
            } catch {
                if (!cancelled) {
                    setError(true);
                    setLoading(false);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [url]);

    return (
        <Box
            ref={containerRef}
            sx={{
                position: "relative",
                width: displaySize ? `${displaySize.width}px` : "100%",
                height: displaySize ? `${displaySize.height}px` : undefined,
                aspectRatio: displaySize ? undefined : "2481 / 3509",
            }}
        >
            {loading && !error && (
                <Skeleton
                    variant="rectangular"
                    animation="wave"
                    sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                />
            )}
            {error && (
                <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography color="text.secondary">证书加载失败</Typography>
                </Box>
            )}
            <canvas ref={canvasRef} style={{ display: loading || error ? "none" : "block" }} />
        </Box>
    );
}
