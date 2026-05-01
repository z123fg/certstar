import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import SaveIcon from "@mui/icons-material/Save";
import { useAppContext } from "../../App";
import CertForm from "./CertForm";
import CertCanvas from "./CertCanvas";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import type { Cert } from "../../types";
import { createOne, deleteOne, getOne, updateOne } from "../../services/cert";
import { getProxiedImageDataUrl, getUploadUrl } from "../../services/sts";
import { downloadCanvasAsImage, exportCanvasAsDataUrl, getSnapshotLayout } from "../../utils/canvasUtils";

export default function CertEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshCerts, setAlert, showBackdrop } = useAppContext();

  const isNew = !id;
  const [formData, setFormData] = useState<Partial<Cert>>({ certType: "WTOP" });
  const [profileImageDataUrl, setProfileImageDataUrl] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const cert = await getOne(id);
        setFormData(cert);
        if (cert.profileImageUrl) {
          setProfileImageDataUrl(await getProxiedImageDataUrl(cert.profileImageUrl));
        }
      } catch {
        setAlert({ type: "error", message: "加载证书数据失败" });
      }
    })();
  }, [id]);

  const validate = () => {
    if (!formData.idNum || !formData.certNum) {
      setAlert({ type: "error", message: "身份证号和证书编号不能为空" });
      return false;
    }
    return true;
  };

  const uploadCertImage = async (certId: string): Promise<string> => {
    const blob = await fetch(exportCanvasAsDataUrl()).then((r) => r.blob());
    const filename = `cert-image/${certId}.png`;
    const uploadUrl = await getUploadUrl(filename, "image/png");
    await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/png" } });
    return filename;
  };

  const uploadProfileImage = async (certId: string): Promise<string | undefined> => {
    if (!profileImageDataUrl) return undefined;
    const blob = await fetch(profileImageDataUrl).then((r) => r.blob());
    const filename = `profile-image/${certId}.jpg`;
    const uploadUrl = await getUploadUrl(filename, "image/jpeg");
    await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
    return filename;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    showBackdrop(true);
    try {
      const tempId = formData.id ?? formData.idNum!;
      const certImageUrl = await uploadCertImage(tempId);
      const profileImageUrl = await uploadProfileImage(tempId);
      const payload = {
        ...formData,
        ...getSnapshotLayout(),
        certImageUrl,
        ...(profileImageUrl ? { profileImageUrl } : {}),
      } as Omit<Cert, "id" | "createdAt" | "updatedAt">;

      if (isNew) {
        await createOne(payload);
      } else {
        await updateOne(id!, payload);
      }
      await refreshCerts();
      setAlert({ type: "success", message: isNew ? "证书创建成功！" : "证书更新成功！" });
      navigate("/");
    } catch {
      setAlert({ type: "error", message: "保存失败，请重试" });
    } finally {
      showBackdrop(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    showBackdrop(true);
    try {
      await deleteOne(id);
      await refreshCerts();
      setAlert({ type: "success", message: "证书已删除" });
      navigate("/");
    } catch {
      setAlert({ type: "error", message: "删除失败，请重试" });
    } finally {
      showBackdrop(false);
      setDeleteOpen(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: "center" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} size="small">返回</Button>
        <Typography variant="h6">{isNew ? "添加证书" : "编辑证书"}</Typography>
      </Stack>

      <Box sx={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
        <Box sx={{ width: 320, flexShrink: 0 }}>
          <CertForm
            data={formData}
            profileImageDataUrl={profileImageDataUrl}
            onChange={setFormData}
            onProfileImageChange={setProfileImageDataUrl}
          />
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit}>提交</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => void downloadCanvasAsImage(`${formData.certNum ?? "certificate"}.png`)}>
              下载
            </Button>
            {!isNew && (
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteOpen(true)}>
                删除
              </Button>
            )}
          </Stack>
        </Box>

        <Box sx={{ flex: 1 }}>
          <CertCanvas cert={formData} profileImageDataUrl={profileImageDataUrl} />
        </Box>
      </Box>

      <DeleteConfirmDialog
        open={deleteOpen}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Box>
  );
}
