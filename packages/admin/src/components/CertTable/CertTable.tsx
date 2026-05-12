import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Checkbox, Chip, Collapse, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, FormControl, InputAdornment, InputLabel,
  Menu, MenuItem, OutlinedInput, Paper, Select, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TableSortLabel, TextField, Tooltip, Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import FilterListIcon from "@mui/icons-material/FilterList";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import JSZip from "jszip";
import { certTypeMap, toChineseDateString, toChineseDatetimeString } from "@certstar/shared";
import { useAppContext } from "../../App";
import type { Cert } from "../../types";
import { renderCertToBlob, triggerBlobDownload, type CertVariant } from "../../utils/canvasUtils";
import intl from "../../intl/intl";

const COLUMNS: { key: keyof Cert; label: string; date?: "date" | "datetime" }[] = [
  { key: "name", label: intl.name },
  { key: "idNum", label: intl.idNum },
  { key: "certNum", label: intl.certNum },
  { key: "certType", label: intl.certType },
  { key: "expDate", label: intl.expDate, date: "date" },
  { key: "organization", label: intl.organization },
  { key: "issuingAgency", label: intl.issuingAgency },
  { key: "createdAt", label: "创建时间", date: "datetime" },
  { key: "updatedAt", label: "更新时间", date: "datetime" },
];

// Config shared by both the filter panel and the active-chip builder
const DATE_RANGE_FILTERS = [
  { label: intl.expDate,  from: "expDateFrom"   as const, to: "expDateTo"   as const },
  { label: "创建时间", from: "createdAtFrom" as const, to: "createdAtTo" as const },
  { label: "更新时间", from: "updatedAtFrom" as const, to: "updatedAtTo" as const },
];

const CERT_TYPE_ENTRIES = Object.entries(certTypeMap) as [string, string][];

/** Resolve a certType code to its display label, falling back to the code itself. */
const certTypeLabel = (code: string): string =>
  certTypeMap[code as keyof typeof certTypeMap] ?? code;

const formatDate = (value: unknown, type: "date" | "datetime"): string =>
  type === "date" ? toChineseDateString(value) : toChineseDatetimeString(value);

type SortDir = "asc" | "desc";

interface Filters {
  certType: string[];      // selected CertTypeCodes; empty = all
  expDateFrom: string;     // "YYYY-MM-DD" or ""
  expDateTo: string;
  createdAtFrom: string;
  createdAtTo: string;
  updatedAtFrom: string;
  updatedAtTo: string;
}

const EMPTY_FILTERS: Filters = {
  certType: [],
  expDateFrom: "", expDateTo: "",
  createdAtFrom: "", createdAtTo: "",
  updatedAtFrom: "", updatedAtTo: "",
};

interface Props {
  certs: Cert[];
  onBatchDelete: (ids: string[]) => Promise<void>;
}

export default function CertTable({ certs, onBatchDelete }: Props) {
  const { setAlert, refreshCerts, complianceMode } = useAppContext();
  const [keyword, setKeyword] = useState("");
  const [sortKey, setSortKey] = useState<keyof Cert>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadAnchor, setDownloadAnchor] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const navigate = useNavigate();

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const handleSort = (key: keyof Cert) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = certs
    .filter((c) =>
      !keyword ||
      [c.name, c.idNum, c.certNum, c.organization, c.issuingAgency].some(
        (v) => v?.toLowerCase().includes(keyword.toLowerCase())
      )
    )
    .filter((c) => filters.certType.length === 0 || filters.certType.includes(c.certType))
    .filter((c) => !filters.expDateFrom || toChineseDateString(c.expDate) >= filters.expDateFrom)
    .filter((c) => !filters.expDateTo || toChineseDateString(c.expDate) <= filters.expDateTo)
    .filter((c) => !filters.createdAtFrom || toChineseDateString(c.createdAt) >= filters.createdAtFrom)
    .filter((c) => !filters.createdAtTo || toChineseDateString(c.createdAt) <= filters.createdAtTo)
    .filter((c) => !filters.updatedAtFrom || toChineseDateString(c.updatedAt) >= filters.updatedAtFrom)
    .filter((c) => !filters.updatedAtTo || toChineseDateString(c.updatedAt) <= filters.updatedAtTo)
    .sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  // Count active column filters (certType counts as one even when multiple selected)
  const activeFilterCount =
    (filters.certType.length > 0 ? 1 : 0) +
    (filters.expDateFrom || filters.expDateTo ? 1 : 0) +
    (filters.createdAtFrom || filters.createdAtTo ? 1 : 0) +
    (filters.updatedAtFrom || filters.updatedAtTo ? 1 : 0);

  const filteredIds = filtered.map((c) => c.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someFilteredSelected = filteredIds.some((id) => selected.has(id)) && !allFilteredSelected;

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(new Set());
    } else {
      setSelected((prev) => new Set([...prev, ...filteredIds]));
    }
  };

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    await onBatchDelete([...selected]);
    setSelected(new Set());
    setDeleteOpen(false);
  };

  const handleDownloadZip = async (variant: CertVariant) => {
    setDownloadAnchor(null);
    setDownloading(true);
    try {
      const selectedCerts = certs.filter((c) => selected.has(c.id));
      const zip = new JSZip();
      // Render sequentially — canvas is a singleton
      for (const cert of selectedCerts) {
        const profileDataUrl = cert.profileImageUrl ?? "";
        const blob = await renderCertToBlob(cert, profileDataUrl, variant);
        zip.file(`${cert.certNum}.pdf`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      triggerBlobDownload(zipBlob, `certificates-${variant}.zip`);
    } catch {
      setAlert({ type: "error", message: intl.downloadError });
    } finally {
      setDownloading(false);
    }
  };

  if (certs.length === 0) {
    return <Typography color="text.secondary" sx={{ textAlign: "center", mt: 6 }}>{intl.noData}</Typography>;
  }

  // Build active chip descriptors for rendering
  const activeChips: { label: string; onDelete: () => void }[] = [
    ...filters.certType.map((code) => ({
      label: `${intl.certType}: ${certTypeLabel(code)}`,
      onDelete: () => setFilter("certType", filters.certType.filter((c) => c !== code)),
    })),
    ...DATE_RANGE_FILTERS.flatMap(({ label, from, to }) =>
      filters[from] || filters[to]
        ? [{ label: `${label}: ${filters[from] || "…"} ~ ${filters[to] || "…"}`, onDelete: () => setFilters((p) => ({ ...p, [from]: "", [to]: "" })) }]
        : []
    ),
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Hidden canvas used by renderCertToBlob for download */}
      <div aria-hidden="true" style={{ position: "fixed", left: "-99999px", top: "-99999px", overflow: "hidden" }}>
        <canvas id="download-canvas" />
      </div>
      {/* ── Toolbar ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder={`${intl.search}...`}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          sx={{
            width: 240,
            "& .MuiInputBase-root": { height: 40, fontSize: "0.875rem" },
          }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            },
          }}
        />
        <Button size="medium" variant="outlined" startIcon={<RefreshIcon />} onClick={refreshCerts}>
          {intl.refresh}
        </Button>
        <Button
          size="medium"
          variant={activeFilterCount > 0 ? "contained" : "outlined"}
          startIcon={<FilterListIcon />}
          onClick={() => setFilterOpen((v) => !v)}
        >
          {intl.filter}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
        {selected.size > 0 && (
          <>
            <Typography variant="body2" color="text.secondary">已选 {selected.size} 条</Typography>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteOpen(true)}
            >
              {intl.delete}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={(e) => setDownloadAnchor(e.currentTarget)}
              disabled={downloading}
            >
              {downloading ? "打包中..." : intl.downloadZip}
            </Button>
            <Menu anchorEl={downloadAnchor} open={Boolean(downloadAnchor)} onClose={() => setDownloadAnchor(null)}>
              <Tooltip title={complianceMode ? intl.complianceNoStampedDownload : ""} placement="left">
                <span>
                  <MenuItem disabled={complianceMode} onClick={() => handleDownloadZip("stamped")}>{intl.stamped}</MenuItem>
                </span>
              </Tooltip>
              <MenuItem onClick={() => handleDownloadZip("stampless")}>{intl.stampless}</MenuItem>
            </Menu>
          </>
        )}
      </Box>

      {/* ── Collapsible filter panel ── */}
      <Collapse in={filterOpen}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
            <FormControl size="small" sx={{ width: 200 }}>
              <InputLabel>{intl.certType}</InputLabel>
              <Select
                multiple
                value={filters.certType}
                onChange={(e) => setFilter("certType", e.target.value as string[])}
                input={<OutlinedInput label={intl.certType} />}
                renderValue={(selected) =>
                  (selected as string[]).map(certTypeLabel).join(", ")
                }
              >
                {CERT_TYPE_ENTRIES.map(([code, label]) => (
                  <MenuItem key={code} value={code}>
                    <Checkbox size="small" checked={filters.certType.includes(code)} />
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* ── Date range groups ── */}
            {DATE_RANGE_FILTERS.map(({ label, from, to }) => (
              <Box
                key={label}
                sx={{
                  display: "flex", gap: 1, alignItems: "flex-end",
                  border: "1px solid", borderColor: "divider", borderRadius: 1,
                  px: 1.5, pt: 2, pb: 1.5, position: "relative",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ position: "absolute", top: -9, left: 8, bgcolor: "background.paper", px: 0.5 }}
                >
                  {label}
                </Typography>
                <TextField
                  size="small" label="从" type="date" value={filters[from]}
                  onChange={(e) => setFilter(from, e.target.value)}
                  sx={{ width: 150 }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  size="small" label="至" type="date" value={filters[to]}
                  onChange={(e) => setFilter(to, e.target.value)}
                  sx={{ width: 150 }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            ))}
            {activeFilterCount > 0 && (
              <Button size="small" onClick={() => setFilters(EMPTY_FILTERS)}>
                清除全部
              </Button>
            )}
          </Box>
        </Paper>
      </Collapse>

      {/* ── Active filter chips ── */}
      {activeChips.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {activeChips.map((chip) => (
            <Chip
              key={chip.label}
              label={chip.label}
              size="small"
              onDelete={chip.onDelete}
            />
          ))}
        </Box>
      )}

      {/* ── Table ── */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={allFilteredSelected}
                  indeterminate={someFilteredSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              {COLUMNS.map((col) => (
                <TableCell key={col.key} sx={{ fontWeight: 600 }}>
                  <TableSortLabel
                    active={sortKey === col.key}
                    direction={sortKey === col.key ? sortDir : "asc"}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((cert) => (
              <TableRow
                key={cert.id}
                hover
                selected={selected.has(cert.id)}
                onClick={() => handleToggle(cert.id)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={selected.has(cert.id)}
                    onChange={() => handleToggle(cert.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                {COLUMNS.map((col) => (
                  <TableCell key={col.key}>
                    {col.key === "certType"
                      ? certTypeMap[cert.certType]
                      : col.date
                      ? formatDate(cert[col.key], col.date)
                      : String(cert[col.key] ?? "")}
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    size="small"
                    onClick={(e) => { e.stopPropagation(); navigate(`/certs/${cert.id}/edit`); }}
                  >
                    编辑
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>{intl.confirmDeleteTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除选中的 {selected.size} 条证书吗？此操作不可撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{intl.cancel}</Button>
          <Button color="error" onClick={handleDelete}>{intl.delete}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
