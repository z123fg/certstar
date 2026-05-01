import { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import type { Cert } from "../../types";
import {
  destroyCanvas, initCanvas, loadTemplate, renderProfileImage,
  renderQRCode, renderTextFields,
} from "../../utils/canvasUtils";

interface Props {
  cert: Partial<Cert>;
  profileImageDataUrl: string;
}

export default function CertCanvas({ cert, profileImageDataUrl }: Props) {
  const initializedRef = useRef(false);
  const certTypeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const init = async () => {
      initCanvas();
      initializedRef.current = true;
      if (cert.certType) {
        certTypeRef.current = cert.certType;
        await loadTemplate(cert.certType);
      }
      if (profileImageDataUrl) await renderProfileImage(profileImageDataUrl, cert);
      if (cert.idNum && cert.certNum) await renderQRCode(cert.idNum, cert.certNum);
    };
    init();
    return () => {
      destroyCanvas();
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!initializedRef.current || !cert.certType) return;
    if (cert.certType === certTypeRef.current) return;
    certTypeRef.current = cert.certType;
    loadTemplate(cert.certType);
  }, [cert.certType]);

  useEffect(() => {
    if (!initializedRef.current) return;
    renderTextFields(cert);
  }, [cert]);

  useEffect(() => {
    if (!initializedRef.current || !cert.idNum || !cert.certNum) return;
    renderQRCode(cert.idNum, cert.certNum);
  }, [cert.idNum, cert.certNum]);

  useEffect(() => {
    if (!initializedRef.current) return;
    renderProfileImage(profileImageDataUrl, cert);
  }, [profileImageDataUrl]);

  return (
    <Box>
      <canvas id="main-canvas" style={{ border: "1px solid #e0e0e0", borderRadius: 4, display: "block" }} />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        按住 Ctrl 可多选，拖动可调整文字位置
      </Typography>
    </Box>
  );
}
