import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import CertCanvas from "../CertEditor/CertCanvas";
import CertForm from "../CertEditor/CertForm";
import type { Cert, CertDraft } from "../../types";
import { getSnapshotLayout } from "../../utils/canvasUtils";
import { isCertDraftValid } from "../../utils/certValidation";
import { useAppContext } from "../../App";
import { useBatchContext } from "./BatchContext";
import { readFileAsDataUrl } from "./fileUtils";

export default function BatchDraftEditorPage() {
  const { index } = useParams();
  const navigate = useNavigate();
  const {
    rows, setRows,
    rowLayouts, setRowLayouts,
    imageMap,
    profileDataUrlOverrides, setProfileDataUrlOverrides,
  } = useBatchContext();

  const { showBackdrop } = useAppContext();
  const draftIndex = Number(index);
  const draft =
    Number.isInteger(draftIndex) && draftIndex >= 0 && draftIndex < rows.length
      ? rows[draftIndex]
      : undefined;
  const savedLayout = draft ? rowLayouts.get(draft._localId) : undefined;

  const [formData, setFormData] = useState<Partial<Cert>>(() =>
    draft ? { ...draft, ...savedLayout } as Partial<Cert> : {}
  );
  const [profileImageDataUrl, setProfileImageDataUrl] = useState(() =>
    draft ? profileDataUrlOverrides.get(draft._localId) ?? "" : ""
  );

  useEffect(() => {
    showBackdrop(true);
    return () => showBackdrop(false);
  }, []);

  useEffect(() => {
    if (!draft || profileImageDataUrl) return;
    const file = imageMap.get(draft.idNum);
    if (file) void readFileAsDataUrl(file).then(setProfileImageDataUrl);
  }, [draft, imageMap, profileImageDataUrl]);

  if (!draft) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/batch/preview")} size="small">返回</Button>
        <Typography color="text.secondary" sx={{ mt: 3 }}>未找到这条批量草稿。</Typography>
      </Box>
    );
  }

  const handleSave = () => {
    const updatedDraft = {
      ...draft,
      name: String(formData.name ?? ""),
      idNum: String(formData.idNum ?? ""),
      organization: String(formData.organization ?? ""),
      certNum: String(formData.certNum ?? ""),
      expDate: String(formData.expDate ?? ""),
      issuingAgency: String(formData.issuingAgency ?? ""),
      certType: formData.certType ?? draft.certType,
    } as CertDraft;

    const layout = getSnapshotLayout();
    setRows((prev) => prev.map((row, i) => (i === draftIndex ? updatedDraft : row)));
    setRowLayouts((prev) => {
      const next = new Map(prev);
      next.delete(draft._localId);
      next.set(updatedDraft._localId, layout);
      return next;
    });
    if (profileImageDataUrl) {
      setProfileDataUrlOverrides((prev) => {
        const next = new Map(prev);
        next.delete(draft._localId);
        next.set(updatedDraft._localId, profileImageDataUrl);
        return next;
      });
    }
    navigate("/batch/preview");
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
        {/* Form panel */}
        <Box sx={{ width: 320, flexShrink: 0 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "center" }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/batch/preview")} size="small">
              返回
            </Button>
            <Typography variant="h6">编辑批量草稿</Typography>
          </Stack>
          <CertForm
            data={formData}
            profileImageDataUrl={profileImageDataUrl}
            onChange={setFormData}
            onProfileImageChange={setProfileImageDataUrl}
          />
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!isCertDraftValid(formData)}>
              保存草稿
            </Button>
          </Stack>
        </Box>

        {/* Canvas panel — shifted up, top overflow hidden */}
        <Box sx={{ overflow: "hidden" }}>
          <Box sx={{ mt: "-100px" }}>
            <CertCanvas cert={formData} profileImageDataUrl={profileImageDataUrl} onReady={() => showBackdrop(false)} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
