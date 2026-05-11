import { useState } from "react";
import {
  Box, Button, FormControl, InputLabel, MenuItem,
  Select, Stack, TextField, Typography,
} from "@mui/material";
import { certTypeMap, parseExpDate, toChineseDateString } from "@certstar/shared";
import type { Cert } from "../../types";
import intl from "../../intl/intl";

interface Props {
  data: Partial<Cert>;
  profileImageDataUrl: string;
  onChange: (data: Partial<Cert>) => void;
  onProfileImageChange: (dataUrl: string) => void;
  disabledFields?: (keyof Cert)[];
}

const TEXT_FIELDS: { key: keyof Cert; required?: boolean }[] = [
  { key: "name" },
  { key: "idNum", required: true },
  { key: "organization" },
  { key: "certNum", required: true },
  { key: "expDate", required: true },
  { key: "issuingAgency" },
];


export default function CertForm({ data, profileImageDataUrl, onChange, onProfileImageChange, disabledFields = [] }: Props) {
  const [touched, setTouched] = useState<Set<keyof Cert>>(new Set());

  const handleChange = (field: keyof Cert, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleBlur = (field: keyof Cert) => {
    setTouched((prev) => new Set([...prev, field]));
  };

  const getFieldError = (key: keyof Cert): string | undefined => {
    const val = String(data[key] ?? "").trim();
    if ((key === "idNum" || key === "certNum" || key === "expDate") && touched.has(key) && !val)
      return `${intl[key as keyof typeof intl]}不能为空`;
    if (key === "expDate" && val && !parseExpDate(data[key]))
      return "格式不正确，支持 yyyy-mm-dd 或 yyyy/mm/dd";
    return undefined;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onProfileImageChange(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Stack spacing={2}>
      <FormControl size="small" fullWidth disabled={disabledFields.includes("certType")}>
        <InputLabel>{intl.certType}</InputLabel>
        <Select
          label={intl.certType}
          value={data.certType ?? ""}
          onChange={(e) => handleChange("certType", e.target.value)}
        >
          {Object.entries(certTypeMap).map(([code, label]) => (
            <MenuItem key={code} value={code}>{label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {TEXT_FIELDS.map(({ key, required }) => {
        const error = getFieldError(key);
        const isDisabled = disabledFields.includes(key);
        return (
          <TextField
            key={key}
            size="small"
            fullWidth
            label={intl[key as keyof typeof intl]}
            required={required}
            disabled={isDisabled}
            value={key === "expDate" ? toChineseDateString(data[key]) : String(data[key] ?? "")}
            error={Boolean(error)}
            helperText={error ?? (key === "expDate" ? intl.expDateHint : undefined)}
            onChange={(e) => handleChange(key, e.target.value)}
            onBlur={() => handleBlur(key)}
          />
        );
      })}

      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{intl.profileImage}</Typography>
        <input id="profile-image-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
        <label htmlFor="profile-image-input">
          <Button variant="outlined" size="small" component="span">
            {profileImageDataUrl ? "更换证件照" : "上传证件照"}
          </Button>
        </label>
        {profileImageDataUrl && (
          <Box
            component="img"
            src={profileImageDataUrl}
            alt="证件照预览"
            sx={{ display: "block", width: 80, height: 96, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider", mt: 1 }}
          />
        )}
      </Box>
    </Stack>
  );
}
