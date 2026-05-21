import { useEffect, useState } from "react";
import PdfViewer from "./PdfViewer";
import { useNavigate, useParams } from "react-router-dom";
import { certTypeMap } from "@certstar/shared";
import type { CertTypeCode } from "@certstar/shared";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import LoaderBackdrop from "./LoaderBackdrop";
import PageLayout from "./PageLayout";

interface CertData {
    id: string;
    name: string;
    idNum: string;
    organization: string;
    certNum: string;
    certType: string;
    issuingAgency: string;
    expDate: string;
    certImageUrl: string | null;
    profileImageUrl: string | null;
    expired?: boolean;
}

type State =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ok"; cert: CertData };

import { formatChineseDateLong } from "@certstar/shared";
import { API_URL } from "./config";

export default function InquiryPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [state, setState] = useState<State>({ status: "loading" });

    useEffect(() => {
        if (!slug) {
            setState({ status: "error", message: "无效的证书链接" });
            return;
        }
        const controller = new AbortController();
        fetch(`${API_URL}/inquiry/${slug}`, { signal: controller.signal })
            .then(async (res) => {
                if (!res.ok) {
                    let msg = "查询失败";
                    try {
                        const errBody = await res.json();
                        msg = errBody.message ?? msg;
                    } catch (_) { /* non-JSON body — keep default message */ }
                    throw new Error(msg);
                }
                const body = await res.json();
                setState({ status: "ok", cert: body.result as CertData });
            })
            .catch((err: Error) => {
                if (err.name === "AbortError") return;
                setState({ status: "error", message: err.message });
            });
        return () => controller.abort();
    }, [slug]);

    return (
        <PageLayout>
            {state.status === "loading" && <LoaderBackdrop />}

            {state.status === "error" && (
                <Stack spacing={1.5} sx={{ pt: 8, alignItems: "center" }}>
                    <Avatar
                        sx={{
                            width: 52,
                            height: 52,
                            bgcolor: "#fdecea",
                            color: "error.dark",
                            fontSize: "1.4rem",
                            fontWeight: 700,
                        }}
                    >
                        ✕
                    </Avatar>
                    <Typography
                        variant="body1"
                        color="text.primary"
                        sx={{ fontWeight: 500 }}
                    >
                        {state.message}
                    </Typography>
                </Stack>
            )}

            {state.status === "ok" && <CertCard cert={state.cert} />}

            {state.status !== "loading" && (
                <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate("/")}
                        sx={{ color: "#fff", borderColor: "#fff", "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.1)" } }}
                    >
                        返回证书搜索页面
                    </Button>
                </Box>
            )}
        </PageLayout>
    );
}

function CertImage({ url }: { url: string }) {
    const isPdf = new URL(url).pathname.toLowerCase().endsWith(".pdf");
    const [imageLoaded, setImageLoaded] = useState(false);

    if (isPdf) {
        return <PdfViewer url={url} />;
    }

    return (
        <Box sx={{ position: "relative", width: "100%", aspectRatio: "2481 / 3509" }}>
            {!imageLoaded && (
                <Skeleton
                    variant="rectangular"
                    animation="wave"
                    sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                />
            )}
            <Box
                component="img"
                src={url}
                alt="证书"
                sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    opacity: imageLoaded ? 1 : 0,
                    transition: "opacity 0.3s",
                }}
                onLoad={() => setImageLoaded(true)}
            />
        </Box>
    );
}

function CertCard({ cert }: { cert: CertData }) {
    const certTypeName =
        certTypeMap[cert.certType as CertTypeCode] ?? cert.certType;

    return (
        <Paper
            elevation={2}
            sx={{ borderRadius: 3, overflow: "hidden", position: "relative" }}
        >
            <Chip
                label={cert.expired ? "已过期" : "有效"}
                sx={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    zIndex: 1,
                    bgcolor: cert.expired ? "#fdecea" : "#e8f5e9",
                    color: cert.expired ? "#c62828" : "#2e7d32",
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    height: 40,
                    borderRadius: 2,
                    px: 1,
                }}
            />

            {cert.certImageUrl && <CertImage url={cert.certImageUrl} />}

            <Table
                size="small"
                sx={{
                    "& .MuiTableCell-root": {
                        borderColor: "divider",
                        py: 1.5,
                        px: 2.5,
                        verticalAlign: "middle",
                    },
                }}
            >
                <TableBody>
                    {[
                        ["姓名", cert.name],
                        ["证件号码", cert.idNum],
                        ["工作单位", cert.organization],
                        ["证书编号", cert.certNum],
                        ["证书类型", certTypeName],
                        ["颁发机构", cert.issuingAgency],
                        ["有效期至", formatChineseDateLong(cert.expDate)],
                    ].map(([label, value]) => (
                        <TableRow key={label}>
                            <TableCell
                                component="th"
                                scope="row"
                                sx={{
                                    whiteSpace: "nowrap",
                                    color: "text.secondary",
                                    fontSize: "0.8rem",
                                }}
                            >
                                {label}
                            </TableCell>
                            <TableCell
                                sx={{
                                    fontSize: "0.95rem",
                                    overflowWrap: "break-word",
                                }}
                            >
                                {value}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Paper>
    );
}
