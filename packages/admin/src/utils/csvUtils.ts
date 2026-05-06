import { certTypeMap, parseExpDate } from "@certstar/shared";
import type { CertDraft } from "../types";

const EXPECTED_COLUMNS = ["name", "idNum", "organization", "certNum", "expDate", "issuingAgency", "certType"] as const;
const VALID_CERT_TYPES = new Set(Object.keys(certTypeMap));

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
  const seenCertNums = new Set<string>();

  lines.slice(1).forEach((line, i) => {
    const rowNum = i + 2;
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });

    const rowErrors: string[] = [];

    if (!row.idNum) rowErrors.push("身份证号不能为空");
    if (!row.certNum) {
      rowErrors.push("证书编号不能为空");
    } else if (seenCertNums.has(row.certNum)) {
      rowErrors.push(`证书编号 ${row.certNum} 重复`);
    }
    if (!parseExpDate(row.expDate)) rowErrors.push("有效期格式不正确，支持 yyyy-mm-dd 或 yyyy/mm/dd");
    if (!VALID_CERT_TYPES.has(row.certType)) rowErrors.push(`证书类型 "${row.certType}" 无效`);

    if (rowErrors.length > 0) {
      errors.push(`第 ${rowNum} 行：${rowErrors.join("，")}`);
      return;
    }

    seenCertNums.add(row.certNum);
    rows.push({
      _localId: row.certNum,
      name: row.name,
      idNum: row.idNum,
      organization: row.organization,
      certNum: row.certNum,
      expDate: parseExpDate(row.expDate)!,
      issuingAgency: row.issuingAgency,
      certType: row.certType as CertDraft["certType"],
    });
  });

  return { rows, errors };
};
