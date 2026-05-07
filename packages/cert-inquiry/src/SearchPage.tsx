import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoaderBackdrop from "./LoaderBackdrop";
import styles from "./SearchPage.module.css";

interface SearchResult {
    slug: string;
    certType: string;
    expDate: string;
}

const API_URL = import.meta.env.VITE_API_URL as string;

const CHINA_DATE_FMT = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
});

function formatDate(iso: string) {
    return CHINA_DATE_FMT.format(new Date(iso));
}

export default function SearchPage() {
    const navigate = useNavigate();
    const [idNum, setIdNum] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [results, setResults] = useState<SearchResult[] | null>(null);

    const handleSearch = async () => {
        const trimmed = idNum.trim();
        if (!trimmed) return;
        setError("");
        setResults(null);
        setLoading(true);
        try {
            const res = await fetch(
                `${API_URL}/inquiry/search?idNum=${encodeURIComponent(trimmed)}`,
            );
            const body = await res.json();
            if (!res.ok) throw new Error(body.message ?? "查询失败");
            const list: SearchResult[] = body.results;
            if (list.length === 0) {
                setError("未找到对应的证书");
            } else if (list.length === 1) {
                navigate(`/${list[0].slug}`);
            } else {
                setResults(list);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "查询失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            {loading && <LoaderBackdrop />}
            <header className={styles.header}>
                <h1>证书查询</h1>
            </header>
            <main className={styles.main}>
                <div className={styles.searchBox}>
                    <p className={styles.hint}>请输入您的身份证号码</p>
                    <div className={styles.inputRow}>
                        <input
                            className={styles.input}
                            type="text"
                            placeholder="身份证号码"
                            value={idNum}
                            onChange={(e) => setIdNum(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <button
                            className={styles.button}
                            onClick={handleSearch}
                            disabled={!idNum.trim() || loading}
                        >
                            查询
                        </button>
                    </div>
                    {error && <p className={styles.error}>{error}</p>}
                </div>

                {results && (
                    <div className={styles.results}>
                        <p className={styles.resultsHint}>找到 {results.length} 张证书，请选择：</p>
                        {results.map((r) => (
                            <div
                                key={r.slug}
                                className={styles.resultItem}
                                onClick={() => navigate(`/${r.slug}`)}
                            >
                                <span className={styles.certType}>{r.certType}</span>
                                <span className={styles.expDate}>有效期至 {formatDate(r.expDate)}</span>
                                <span className={styles.arrow}>›</span>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
