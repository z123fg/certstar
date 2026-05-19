import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import type { VirtuosoHandle } from "react-virtuoso";
import { useAppContext } from "../../App";
import type { Cert } from "../../types";
import { useScrollRestore } from "./hooks/useScrollRestore";
import { useSelection } from "./hooks/useSelection";
import { useCertFilter } from "./hooks/useCertFilter";
import { useZipDownload } from "./hooks/useZipDownload";
import CertToolbar from "./components/CertToolbar";
import CertFilterPanel from "./components/CertFilterPanel";
import CertVirtuosoTable from "./components/CertVirtuosoTable";
import CertDialogs from "./components/CertDialogs";
import intl from "../../intl/intl";

interface Props {
    certs: Cert[];
    onBatchDelete: (ids: string[]) => Promise<void>;
}

export default function CertTable({ certs, onBatchDelete }: Props) {
    const { setAlert, refreshCerts, complianceMode, setComplianceMode } =
        useAppContext();
    const navigate = useNavigate();
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const scrollerRef = useRef<HTMLDivElement | null>(null);

    // ── Scroll restoration (across editor navigation) ──
    const { initialState, saveState } = useScrollRestore();

    // ── Row selection (with scroll-position preservation on each toggle) ──
    const { selected, handleToggle, handleSelectAll, clearSelection } =
        useSelection(scrollerRef);

    // ── Filtering & sorting ──
    const {
        keyword,
        setKeyword,
        sortKey,
        sortDir,
        handleSort,
        filters,
        setFilters,
        setFilter,
        filtered,
        activeFilterCount,
        activeChips,
    } = useCertFilter(certs);

    // ── ZIP download ──
    const {
        downloading,
        downloadAnchor,
        setDownloadAnchor,
        handleDownloadZip,
    } = useZipDownload(certs, selected, setAlert);

    // ── Dialog open/close state ──
    const [filterOpen, setFilterOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [complianceConfirmOpen, setComplianceConfirmOpen] = useState(false);

    // ── Derived selection state (needed by both toolbar and table) ──
    const filteredIds = filtered.map((c) => c.id);
    const allFilteredSelected =
        filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
    const someFilteredSelected =
        filteredIds.some((id) => selected.has(id)) && !allFilteredSelected;

    const handleDelete = async () => {
        try {
            await onBatchDelete([...selected]);
        } finally {
            clearSelection();
            setDeleteOpen(false);
        }
    };

    const handleEditCert = (cert: Cert) => {
        virtuosoRef.current?.getState(saveState);
        navigate(`/certs/${cert.id}/edit`);
    };

    if (certs.length === 0) {
        return (
            <Typography
                color="text.secondary"
                sx={{ textAlign: "center", mt: 6 }}
            >
                {intl.noData}
            </Typography>
        );
    }
    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                flex: 1,
                minHeight: 0,
            }}
        >
            {/* Hidden canvas used by renderCertToBlob for ZIP download */}
            <div
                aria-hidden="true"
                style={{
                    position: "fixed",
                    left: "-99999px",
                    top: "-99999px",
                    overflow: "hidden",
                }}
            >
                <canvas id="download-canvas" />
            </div>

            <CertToolbar
                keyword={keyword}
                onKeywordChange={setKeyword}
                onRefresh={refreshCerts}
                onFilterToggle={() => setFilterOpen((v) => !v)}
                activeFilterCount={activeFilterCount}
                selectedCount={selected.size}
                downloading={downloading}
                downloadAnchor={downloadAnchor}
                onDownloadMenuOpen={(el) => setDownloadAnchor(el)}
                onDownloadMenuClose={() => setDownloadAnchor(null)}
                onDownloadZip={handleDownloadZip}
                complianceMode={complianceMode}
                onComplianceModeClick={() => setComplianceConfirmOpen(true)}
                onDeleteClick={() => setDeleteOpen(true)}
                onAddOne={() => navigate("/certs/new")}
                onAddMany={() => navigate("/batch")}
                onPdfBatch={() => navigate("/pdf-batch")}
            />

            <CertFilterPanel
                filterOpen={filterOpen}
                filters={filters}
                setFilter={setFilter}
                setFilters={setFilters}
                activeFilterCount={activeFilterCount}
                activeChips={activeChips}
            />

            <CertVirtuosoTable
                virtuosoRef={virtuosoRef}
                scrollerRef={scrollerRef}
                data={filtered}
                initialState={initialState}
                selected={selected}
                sortKey={sortKey}
                sortDir={sortDir}
                allFilteredSelected={allFilteredSelected}
                someFilteredSelected={someFilteredSelected}
                onSort={handleSort}
                onSelectAll={() =>
                    handleSelectAll(filteredIds, allFilteredSelected)
                }
                onToggle={handleToggle}
                onEdit={handleEditCert}
            />

            <CertDialogs
                complianceConfirmOpen={complianceConfirmOpen}
                onComplianceConfirmClose={() => setComplianceConfirmOpen(false)}
                complianceMode={complianceMode}
                onComplianceModeToggle={() =>
                    setComplianceMode(!complianceMode)
                }
                deleteOpen={deleteOpen}
                onDeleteClose={() => setDeleteOpen(false)}
                selectedCount={selected.size}
                onDeleteConfirm={handleDelete}
            />
        </Box>
    );
}
