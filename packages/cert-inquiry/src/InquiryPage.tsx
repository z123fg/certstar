import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { certTypeMap } from "@certstar/shared";
import type { CertTypeCode } from "@certstar/shared";
import LoaderBackdrop from "./LoaderBackdrop";
import styles from "./InquiryPage.module.css";

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

const API_URL = import.meta.env.VITE_API_URL as string;

function maskIdNum(idNum: string) {
    if (idNum.length <= 4) return idNum;
    return "*".repeat(idNum.length - 4) + idNum.slice(-4);
}

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
        fetch(`${API_URL}/inquiry/${slug}`)
            .then(async (res) => {
                const body = await res.json();
                if (res.status === 410) throw new Error("证书已过期");
                if (!res.ok) throw new Error(body.message ?? "查询失败");
                setState({ status: "ok", cert: body.result as CertData });
            })
            .catch((err: Error) =>
                setState({ status: "error", message: err.message }),
            );
    }, [slug]);

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1>证书查询</h1>
            </header>

            <main className={styles.main}>
                {state.status === "loading" && <LoaderBackdrop />}

                {state.status === "error" && (
                    <div className={styles.center}>
                        <div className={styles.notFound}>
                            <span className={styles.icon}>✕</span>
                            <h2>{state.message}</h2>
                        </div>
                    </div>
                )}

                {state.status === "ok" && <CertCard cert={state.cert} />}
            </main>
        </div>
    );
}

function CertCard({ cert }: { cert: CertData }) {
    const certTypeName =
        certTypeMap[cert.certType as CertTypeCode] ?? cert.certType;
    return (
        <div className={styles.card}>
            <div className={styles.validBadge}>有效</div>

            {cert.certImageUrl && (
                <div className={styles.certImageWrap}>
                    <img
                        src={cert.certImageUrl}
                        alt="证书"
                        className={styles.certImage}
                    />
                </div>
            )}

            <div className={styles.fields}>
                <Field label="姓名" value={cert.name} />
                <Field label="证件号码" value={maskIdNum(cert.idNum)} />
                <Field label="工作单位" value={cert.organization} />
                <Field label="证书编号" value={cert.certNum} />
                <Field label="证书类型" value={certTypeName} />
                <Field label="颁发机构" value={cert.issuingAgency} />
                <Field label="有效期至" value={formatDate(cert.expDate)} />
            </div>
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className={styles.field}>
            <span className={styles.fieldLabel}>{label}</span>
            <span className={styles.fieldValue}>{value}</span>
        </div>
    );
}
