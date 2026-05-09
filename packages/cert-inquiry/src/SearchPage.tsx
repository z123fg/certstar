import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import PageLayout from "./PageLayout";

interface SearchResult {
    slug: string;
    name: string;
    certType: string;
    certNum: string;
}

import { API_URL } from "./config";

const DEBOUNCE_MS = 300;

export default function SearchPage() {
    const navigate = useNavigate();
    const [idNum, setIdNum] = useState("");
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const highlightedRef = useRef<SearchResult | null>(null);

    const search = async (value: string) => {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const res = await fetch(
                `${API_URL}/inquiry/search?idNum=${encodeURIComponent(value)}`,
                { signal: controller.signal },
            );
            const body = await res.json();
            if (!res.ok) throw new Error(body.message ?? "查询失败");
            setResults(body.results as SearchResult[]);
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            setResults([]);
            setError("查询失败，请稍后重试");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (value: string) => {
        setIdNum(value);
        if (!value.trim()) {
            setResults([]);
            setOpen(false);
            setLoading(false);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (abortRef.current) abortRef.current.abort();
            return;
        }
        setOpen(true);
        setError(null);
        setLoading(true); // show spinner immediately during debounce
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(
            () => search(value.trim()),
            DEBOUNCE_MS,
        );
    };

    const navigateToFirst = () => {
        if (results.length > 0) navigate(`/${results[0].slug}`);
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (abortRef.current) abortRef.current.abort();
        };
    }, []);

    return (
        <PageLayout maxWidth={480}>
            <Paper
                elevation={2}
                sx={{ borderRadius: 3, p: "28px 24px", marginTop: "50px" }}
            >
                <Typography
                    variant="subtitle1"
                    sx={{ textAlign: "left", mb: 2, fontWeight: 500 }}
                >
                    请输入完整身份证号码查询证书
                </Typography>

                <Box sx={{ display: "flex", gap: 1 }}>
                    <Autocomplete
                        sx={{ flex: 1 }}
                        options={results}
                        getOptionLabel={(o) => o.name}
                        filterOptions={(x) => x}
                        loading={loading}
                        loadingText={null}
                        noOptionsText={error ?? "未找到证书"}
                        open={open}
                        onClose={(_, reason) => {
                            if (reason === "blur" || reason === "escape")
                                setOpen(false);
                        }}
                        value={null}
                        inputValue={idNum}
                        onInputChange={(_, value, reason) => {
                            if (reason === "input") handleInputChange(value);
                        }}
                        onChange={(_, option) => {
                            if (option) navigate(`/${option.slug}`);
                        }}
                        onHighlightChange={(_, option) => {
                            highlightedRef.current = option;
                        }}
                        renderOption={(props, option) => {
                            const { key, ...rest } = props as typeof props & {
                                key: string;
                            };
                            return (
                                <li key={key} {...rest}>
                                    <ListItemText
                                        primary={option.name}
                                        secondary={`${option.certType} · ${option.certNum}`}
                                        slotProps={{
                                            primary: {
                                                sx: {
                                                    fontWeight: 600,
                                                    color: "primary.main",
                                                    fontSize: "0.95rem",
                                                },
                                            },
                                            secondary: {
                                                sx: { fontSize: "0.8rem" },
                                            },
                                        }}
                                    />
                                </li>
                            );
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                size="small"
                                placeholder="身份证号码"
                                autoComplete="off"
                                onKeyDown={(e) => {
                                    if (
                                        e.key === "Enter" &&
                                        !highlightedRef.current
                                    ) {
                                        navigateToFirst();
                                    }
                                }}
                            />
                        )}
                    />

                    <Button
                        variant="contained"
                        disableElevation
                        disabled={loading || results.length === 0}
                        onClick={navigateToFirst}
                        sx={{
                            height: 40,
                            flexShrink: 0,
                            bgcolor: "#1a3a6b",
                            "&:hover": { bgcolor: "#15305a" },
                        }}
                    >
                        查询
                    </Button>
                </Box>
            </Paper>
        </PageLayout>
    );
}
