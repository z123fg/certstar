import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import CertForm from "../CertEditor/CertForm";
import type { Cert, CertDraft } from "../../types";
import { isCertDraftValid } from "../../utils/certValidation";
import { usePdfBatchContext } from "./PdfBatchContext";
import intl from "../../intl/intl";

export default function PdfBatchDraftEditorPage() {
  const { localId } = useParams();
  const navigate = useNavigate();
  const { rows, setRows, pdfMap } = usePdfBatchContext();

  const draftIndex = rows.findIndex((r) => r._localId === localId);
  const draft = draftIndex !== -1 ? rows[draftIndex] : undefined;

  const [formData, setFormData] = useState<Partial<Cert>>(() =>
    draft ? { ...draft } as Partial<Cert> : {}
  );

  // Create an object URL for the matched PDF; re-create if the certNum changes.
  const [pdfObjectUrl, setPdfObjectUrl] = useState("");
  useEffect(() => {
    if (!draft) return;
    const file = pdfMap.get(draft.certNum);
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPdfObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft?.certNum]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!draft) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/pdf-batch/preview")} size="small">{intl.back}</Button>
        <Typography color="text.secondary" sx={{ mt: 3 }}>{intl.draftNotFound}</Typography>
      </Box>
    );
  }

  const handleSave = () => {
    const updated: CertDraft = {
      ...draft,
      name: String(formData.name ?? ""),
      idNum: String(formData.idNum ?? ""),
      organization: String(formData.organization ?? ""),
      certNum: String(formData.certNum ?? ""),
      expDate: String(formData.expDate ?? ""),
      issuingAgency: String(formData.issuingAgency ?? ""),
      certType: formData.certType ?? draft.certType,
    };
    setRows((prev) => prev.map((row) => row._localId === draft._localId ? updated : row));
    navigate("/pdf-batch/preview");
  };

  return (
    <Box sx={{ p: 3, display: "flex", gap: 4, alignItems: "flex-start" }}>
      {/* Form panel */}
      <Box sx={{ width: 320, flexShrink: 0 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "center" }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/pdf-batch/preview")} size="small">
            {intl.back}
          </Button>
          <Typography variant="h6">{intl.editDraft}</Typography>
        </Stack>
        <CertForm
          data={formData}
          profileImageDataUrl=""
          onChange={setFormData}
          onProfileImageChange={() => {}}
          disabledFields={["certNum"]}
        />
        <Divider sx={{ my: 2 }} />
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!isCertDraftValid(formData)}
        >
          {intl.saveDraft}
        </Button>
      </Box>

      {/* PDF preview panel */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {pdfObjectUrl ? (
          <Box
            component="iframe"
            src={pdfObjectUrl}
            sx={{
              width: "100%",
              height: "calc(100vh - 80px)",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              display: "block",
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "calc(100vh - 80px)",
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography color="text.disabled">{intl.noPdfFound}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
