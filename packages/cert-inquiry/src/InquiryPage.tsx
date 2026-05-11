import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { certTypeMap } from "@certstar/shared";
import type { CertTypeCode } from "@certstar/shared";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
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
}

type State =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ok"; cert: CertData };

import { API_URL } from "./config";

const CHINA_DATE_FMT = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
});

function formatDate(iso: string) {
    return CHINA_DATE_FMT.format(new Date(iso));
}

export default function InquiryPage() {
    const { slug } = useParams<{ slug: string }>();
    const [state, setState] = useState<State>({ status: "loading" });

    useEffect(() => {
        if (!slug) {
            setState({ status: "error", message: "无效的证书链接" });
            return;
        }
        const controller = new AbortController();
        fetch(`${API_URL}/inquiry/${slug}`, { signal: controller.signal })
            .then(async (res) => {
                if (res.status === 410) throw new Error("证书已过期");
                // Check ok before parsing — a non-JSON error body would throw
                // SyntaxError and hide the real HTTP status.
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
        </PageLayout>
    );
}

function CertImage({ url }: { url: string }) {
    const isPdf = new URL(url).pathname.toLowerCase().endsWith(".pdf");
    const [imageLoaded, setImageLoaded] = useState(false);

    if (isPdf) {
        return (
            <Box sx={{ width: "100%", aspectRatio: "2481 / 3509" }}>
                <Box
                    component="iframe"
                    src={url}
                    title="证书文件"
                    sx={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        display: "block",
                    }}
                />
            </Box>
        );
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
                label="有效"
                size="small"
                sx={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    zIndex: 1,
                    bgcolor: "#e8f5e9",
                    color: "#2e7d32",
                    fontWeight: 600,
                    fontSize: "0.75rem",
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
                        ["有效期至", formatDate(cert.expDate)],
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
