import type { CertDraft } from "../types";

const EXPECTED_COLUMNS = ["name", "idNum", "organization", "certNum", "expDate", "issuingAgency", "certType"] as const;

export interface CsvParseResult {
  rows: CertDraft[];
  errors: string[];
}

export const parseCertCsv = (text: string): CsvParseResult => {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ["CSV 文件为空"] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const missing = EXPECTED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) return { rows: [], errors: [`CSV 缺少列：${missing.join(", ")}`] };

  const errors: string[] = [];
  const rows: CertDraft[] = [];

  lines.slice(1).forEach((line, i) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });

    if (!row.idNum || !row.certNum) {
      errors.push(`第 ${i + 2} 行：身份证号和证书编号不能为空`);
      return;
    }

    rows.push({
      _localId: row.idNum,
      name: row.name,
      idNum: row.idNum,
      organization: row.organization,
      certNum: row.certNum,
      expDate: row.expDate,
      issuingAgency: row.issuingAgency,
      certType: row.certType as CertDraft["certType"],
    });
  });

  return { rows, errors };
};
