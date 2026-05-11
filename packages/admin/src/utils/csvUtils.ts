import Papa from "papaparse";
import { certTypeMap, parseExpDate } from "@certstar/shared";
import type { CertDraft } from "../types";

const EXPECTED_COLUMNS = ["name", "idNum", "organization", "certNum", "expDate", "issuingAgency", "certType"] as const;

// Reverse map: Chinese label → abbreviation key (e.g. "焊接热处理操作人员" → "WTOP")
const certTypeByLabel = Object.fromEntries(
  Object.entries(certTypeMap).map(([code, label]) => [label, code])
) as Record<string, string>;

export interface CsvParseResult {
  rows: CertDraft[];
  errors: string[];
}

export const parseCertCsv = (text: string): CsvParseResult => {
  const { data, errors: parseErrs } = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });

  if (parseErrs.length > 0 || data.length === 0) {
    return { rows: [], errors: ["CSV 文件解析失败，请检查文件格式"] };
  }

  const headers = Object.keys(data[0]);
  const missing = EXPECTED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) return { rows: [], errors: [`CSV 缺少列：${missing.join(", ")}`] };

  const errors: string[] = [];
  const rows: CertDraft[] = [];
  const seenCertNums = new Set<string>();

  data.forEach((row, i) => {
    const rowNum = i + 2;
    const rowErrors: string[] = [];

    if (!row.idNum) rowErrors.push("身份证号不能为空");
    if (!row.certNum) {
      rowErrors.push("证书编号不能为空");
    } else if (seenCertNums.has(row.certNum)) {
      rowErrors.push(`证书编号 ${row.certNum} 重复`);
    } else {
      // Register early so a later row with the same certNum is also flagged as duplicate,
      // even if the current row has other validation errors.
      seenCertNums.add(row.certNum);
    }
    if (!parseExpDate(row.expDate)) rowErrors.push("有效期格式不正确，支持 yyyy-mm-dd 或 yyyy/mm/dd");
    const certTypeCode = certTypeByLabel[row.certType];
    if (!certTypeCode) rowErrors.push(`证书类型 "${row.certType}" 无效，请使用中文名称（如：焊接热处理操作人员）`);

    if (rowErrors.length > 0) {
      errors.push(`第 ${rowNum} 行：${rowErrors.join("，")}`);
      return;
    }

    rows.push({
      _localId: row.certNum,
      name: row.name,
      idNum: row.idNum,
      organization: row.organization,
      certNum: row.certNum,
      expDate: parseExpDate(row.expDate)!,
      issuingAgency: row.issuingAgency,
      certType: certTypeCode as CertDraft["certType"],
    });
  });

  return { rows, errors };
};
