import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, InputAdornment, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { certTypeMap } from "@certstar/shared";
import type { Cert } from "../../types";

const COLUMNS: { key: keyof Cert; label: string }[] = [
  { key: "name", label: "姓名" },
  { key: "idNum", label: "身份证号" },
  { key: "certNum", label: "证书编号" },
  { key: "certType", label: "证书类型" },
  { key: "expDate", label: "有效期" },
  { key: "organization", label: "工作单位" },
  { key: "issuingAgency", label: "发证机构" },
];

interface Props {
  certs: Cert[];
}

export default function CertTable({ certs }: Props) {
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();

  const filtered = certs.filter((c) =>
    Object.values(c).some((v) => String(v).toLowerCase().includes(keyword.toLowerCase()))
  );

  if (certs.length === 0) {
    return <Typography color="text.secondary" sx={{ textAlign: "center", mt: 6 }}>暂无证书数据</Typography>;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        size="small"
        placeholder="搜索..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        sx={{ width: 280 }}
        slotProps={{
          input: {
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          },
        }}
      />
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              {COLUMNS.map((col) => (
                <TableCell key={col.key} sx={{ fontWeight: 600 }}>{col.label}</TableCell>
              ))}
              <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((cert) => (
              <TableRow key={cert.id} hover>
                {COLUMNS.map((col) => (
                  <TableCell key={col.key}>
                    {col.key === "certType"
                      ? certTypeMap[cert.certType]
                      : String(cert[col.key] ?? "")}
                  </TableCell>
                ))}
                <TableCell>
                  <Button size="small" onClick={() => navigate(`/certs/${cert.id}/edit`)}>编辑</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
