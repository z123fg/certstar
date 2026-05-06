import { createContext, useContext, useState } from "react";
import { Outlet } from "react-router-dom";
import type { Cert, CertDraft } from "../../types";

interface BatchContextValue {
  rows: CertDraft[];
  setRows: React.Dispatch<React.SetStateAction<CertDraft[]>>;
  rowLayouts: Map<string, Partial<Cert>>;
  setRowLayouts: React.Dispatch<React.SetStateAction<Map<string, Partial<Cert>>>>;
  profileDataUrlOverrides: Map<string, string>;
  setProfileDataUrlOverrides: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  imageMap: Map<string, File>;
  setImageMap: React.Dispatch<React.SetStateAction<Map<string, File>>>;
}

const BatchContext = createContext<BatchContextValue>({} as BatchContextValue);

export const useBatchContext = () => useContext(BatchContext);

// Used as a React Router layout route — renders <Outlet /> inside the provider
export function BatchProvider() {
  const [rows, setRows] = useState<CertDraft[]>([]);
  const [rowLayouts, setRowLayouts] = useState<Map<string, Partial<Cert>>>(new Map());
  const [profileDataUrlOverrides, setProfileDataUrlOverrides] = useState<Map<string, string>>(new Map());
  const [imageMap, setImageMap] = useState<Map<string, File>>(new Map());

  return (
    <BatchContext.Provider value={{
      rows, setRows,
      rowLayouts, setRowLayouts,
      profileDataUrlOverrides, setProfileDataUrlOverrides,
      imageMap, setImageMap,
    }}>
      <Outlet />
    </BatchContext.Provider>
  );
}
