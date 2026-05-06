import { parseExpDate } from "@certstar/shared";
import type { Cert } from "../types";

/** Returns a list of validation error messages. Empty array means valid. */
export const validateCertDraft = (draft: Partial<Cert>): string[] => {
  const errors: string[] = [];
  if (!draft.idNum?.trim()) errors.push("身份证号不能为空");
  if (!draft.certNum?.trim()) errors.push("证书编号不能为空");
  if (!draft.expDate?.trim()) {
    errors.push("有效期至不能为空");
  } else if (!parseExpDate(draft.expDate)) {
    errors.push("有效期格式不正确，支持 yyyy-mm-dd 或 yyyy/mm/dd");
  }
  return errors;
};

/** Returns true when the draft passes all validation rules. */
export const isCertDraftValid = (draft: Partial<Cert>): boolean =>
  validateCertDraft(draft).length === 0;
