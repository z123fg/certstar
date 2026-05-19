import {
    Box,
    Button,
    Divider,
    InputAdornment,
    Menu,
    MenuItem,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import FilterListIcon from "@mui/icons-material/FilterList";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import type { CertVariant } from "../../../utils/canvasUtils";
import intl from "../../../intl/intl";

interface CertToolbarProps {
    keyword: string;
    onKeywordChange: (keyword: string) => void;
    onRefresh: () => void;
    onFilterToggle: () => void;
    activeFilterCount: number;
    selectedCount: number;
    downloading: boolean;
    downloadAnchor: HTMLElement | null;
    onDownloadMenuOpen: (el: HTMLElement) => void;
    onDownloadMenuClose: () => void;
    onDownloadZip: (variant: CertVariant) => void;
    complianceMode: boolean;
    onComplianceModeClick: () => void;
    onDeleteClick: () => void;
    onAddOne: () => void;
    onAddMany: () => void;
    onPdfBatch: () => void;
}

export default function CertToolbar({
    keyword,
    onKeywordChange,
    onRefresh,
    onFilterToggle,
    activeFilterCount,
    selectedCount,
    downloading,
    downloadAnchor,
    onDownloadMenuOpen,
    onDownloadMenuClose,
    onDownloadZip,
    complianceMode,
    onComplianceModeClick,
    onDeleteClick,
    onAddOne,
    onAddMany,
    onPdfBatch,
}: CertToolbarProps) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <TextField
                size="small"
                placeholder={`${intl.search}...`}
                value={keyword}
                onChange={(e) => onKeywordChange(e.target.value)}
                sx={{
                    width: 220,
                    "& .MuiInputBase-root": { height: 32, fontSize: "0.875rem" },
                }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    },
                }}
            />
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={onRefresh}>
                {intl.refresh}
            </Button>
            <Button
                size="small"
                variant={activeFilterCount > 0 ? "contained" : "outlined"}
                startIcon={<FilterListIcon />}
                onClick={onFilterToggle}
            >
                {intl.filter}
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>

            <Box sx={{ flex: 1 }} />

            {selectedCount > 0 && (
                <>
                    <Typography variant="body2" color="text.secondary">
                        已选 {selectedCount} 条
                    </Typography>
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={onDeleteClick}
                    >
                        {intl.delete}
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={(e) => onDownloadMenuOpen(e.currentTarget)}
                        disabled={downloading}
                    >
                        {downloading ? "打包中..." : intl.downloadZip}
                    </Button>
                    <Menu
                        anchorEl={downloadAnchor}
                        open={Boolean(downloadAnchor)}
                        onClose={onDownloadMenuClose}
                    >
                        <Tooltip
                            title={complianceMode ? intl.complianceNoStampedDownload : ""}
                            placement="left"
                        >
                            <span>
                                <MenuItem
                                    disabled={complianceMode}
                                    onClick={() => onDownloadZip("stamped")}
                                >
                                    {intl.stamped}
                                </MenuItem>
                            </span>
                        </Tooltip>
                        <MenuItem onClick={() => onDownloadZip("stampless")}>
                            {intl.stampless}
                        </MenuItem>
                    </Menu>
                </>
            )}

            <Divider orientation="vertical" flexItem />
            <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={onAddOne}
            >
                {intl.addOne}
            </Button>
            <Button
                variant="outlined"
                size="small"
                startIcon={<UploadFileIcon />}
                onClick={onAddMany}
            >
                {intl.addMany}
            </Button>
            <Button
                variant="outlined"
                size="small"
                startIcon={<PictureAsPdfIcon />}
                onClick={onPdfBatch}
            >
                {intl.pdfBatchEntry}
            </Button>
            <Tooltip title={intl.complianceModeDesc}>
                <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer" }}
                    onClick={onComplianceModeClick}
                >
                    <Switch
                        checked={complianceMode}
                        color="warning"
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                        onChange={onComplianceModeClick}
                    />
                    <Typography variant="body2">{intl.complianceMode}</Typography>
                </Box>
            </Tooltip>
        </Box>
    );
}
