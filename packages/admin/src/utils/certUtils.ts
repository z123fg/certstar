import { toChineseDate } from "@certstar/shared";
import type { Cert } from "../types";

/** Normalize DB cert data for use in the editor — converts expDate from ISO timestamp to plain China date string. */
export const normalizeCert = (cert: Partial<Cert>): Partial<Cert> =>
    cert.expDate ? { ...cert, expDate: toChineseDate(cert.expDate) } : cert;
