import { createContext, useContext, useState } from "react";
import { Outlet } from "react-router-dom";
import type { CertDraft } from "../../types";

interface PdfBatchContextValue {
  rows: CertDraft[];
  setRows: React.Dispatch<React.SetStateAction<CertDraft[]>>;
  /** Keyed by certNum (matches PDF filename without extension) */
  pdfMap: Map<string, File>;
  setPdfMap: React.Dispatch<React.SetStateAction<Map<string, File>>>;
}

const PdfBatchContext = createContext<PdfBatchContextValue>({} as PdfBatchContextValue);

export const usePdfBatchContext = () => useContext(PdfBatchContext);

export function PdfBatchProvider() {
  const [rows, setRows] = useState<CertDraft[]>([]);
  const [pdfMap, setPdfMap] = useState<Map<string, File>>(new Map());

  return (
    <PdfBatchContext.Provider value={{ rows, setRows, pdfMap, setPdfMap }}>
      <Outlet />
    </PdfBatchContext.Provider>
  );
}
