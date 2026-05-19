import { forwardRef, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import {
    Button,
    Checkbox,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
} from "@mui/material";
import {
    TableVirtuoso,
    type TableComponents,
    type VirtuosoHandle,
    type StateSnapshot,
} from "react-virtuoso";
import {
    certTypeMap,
    toChineseDateString,
    toChineseDatetimeString,
} from "@certstar/shared";
import type { Cert } from "../../../types";
import type { SortDir } from "../hooks/useCertFilter";
import intl from "../../../intl/intl";

const COLUMNS: {
    key: keyof Cert;
    label: string;
    date?: "date" | "datetime";
    clip?: number;
}[] = [
    { key: "name", label: intl.name },
    { key: "idNum", label: intl.idNum },
    { key: "certNum", label: intl.certNum },
    { key: "certType", label: intl.certType },
    { key: "expDate", label: intl.expDate, date: "date" },
    { key: "organization", label: intl.organization, clip: 160 },
    { key: "issuingAgency", label: intl.issuingAgency, clip: 160 },
    { key: "createdAt", label: "创建时间", date: "datetime" },
    { key: "updatedAt", label: "更新时间", date: "datetime" },
];

const formatDate = (value: unknown, type: "date" | "datetime"): string =>
    type === "date" ? toChineseDateString(value) : toChineseDatetimeString(value);

// ── Stable Virtuoso sub-components ──────────────────────────────────────────
// Defined outside the render function so their identity never changes between
// renders. A new identity would cause Virtuoso to unmount and remount those
// DOM nodes, losing scroll position or causing flicker.

const VirtuosoTable = (props: React.HTMLAttributes<HTMLTableElement>) => (
    <Table size="small" {...props} sx={{ minWidth: 1200 }} />
);

const VirtuosoTableHead = forwardRef<HTMLTableSectionElement>(
    (props, ref) => <TableHead {...props} ref={ref} />,
);

const VirtuosoTableBody = forwardRef<HTMLTableSectionElement>(
    (props, ref) => <TableBody {...props} ref={ref} />,
);

// ────────────────────────────────────────────────────────────────────────────

interface CertVirtuosoTableProps {
    virtuosoRef: React.RefObject<VirtuosoHandle | null>;
    scrollerRef: React.RefObject<HTMLDivElement | null>;
    data: Cert[];
    initialState: StateSnapshot | undefined;
    selected: Set<string>;
    sortKey: keyof Cert;
    sortDir: SortDir;
    allFilteredSelected: boolean;
    someFilteredSelected: boolean;
    onSort: (key: keyof Cert) => void;
    onSelectAll: () => void;
    onToggle: (id: string) => void;
    onEdit: (cert: Cert) => void;
}

export default function CertVirtuosoTable({
    virtuosoRef,
    scrollerRef,
    data,
    initialState,
    selected,
    sortKey,
    sortDir,
    allFilteredSelected,
    someFilteredSelected,
    onSort,
    onSelectAll,
    onToggle,
    onEdit,
}: CertVirtuosoTableProps) {
    // Keep mutable refs so VirtuosoTableRow can read the latest values without
    // being recreated on every selection change (which would remount all rows).
    const selectedRef = useRef(selected);
    const onToggleRef = useRef(onToggle);
    useLayoutEffect(() => {
        selectedRef.current = selected;
        onToggleRef.current = onToggle;
    }, [selected, onToggle]);

    // Scroller: memoized so it keeps the same identity across renders.
    // scrollerRef is a stable ref object so the dep array is empty.
    const Scroller = useMemo(
        () =>
            forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
                (props, ref) => (
                    <TableContainer
                        component={Paper}
                        variant="outlined"
                        {...props}
                        ref={(el: HTMLDivElement | null) => {
                            scrollerRef.current = el;
                            if (typeof ref === "function") ref(el);
                            else if (ref) ref.current = el;
                        }}
                        sx={{ overflowX: "auto" }}
                    />
                ),
            ),
        [], // eslint-disable-line react-hooks/exhaustive-deps
    );

    // TableRow: stable identity (useCallback with empty deps), reads latest
    // selected/onToggle through refs so rows are never unmounted on selection.
    const VirtuosoTableRow = useCallback(
        ({
            item,
            ...props
        }: { item: Cert } & React.HTMLAttributes<HTMLTableRowElement>) => (
            <TableRow
                hover
                selected={selectedRef.current.has(item.id)}
                onClick={() => onToggleRef.current(item.id)}
                sx={{ cursor: "pointer" }}
                {...props}
            />
        ),
        [],
    );

    const components = useMemo<TableComponents<Cert>>(
        () => ({
            Scroller,
            Table: VirtuosoTable,
            TableHead: VirtuosoTableHead,
            TableRow: VirtuosoTableRow,
            TableBody: VirtuosoTableBody,
        }),
        [Scroller, VirtuosoTableRow],
    );

    return (
        <TableVirtuoso
            ref={virtuosoRef}
            data={data}
            restoreStateFrom={initialState}
            style={{ flex: 1, minHeight: 0 }}
            increaseViewportBy={500}
            components={components}
            fixedHeaderContent={() => (
                <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell padding="checkbox">
                        <Checkbox
                            size="small"
                            checked={allFilteredSelected}
                            indeterminate={someFilteredSelected}
                            onChange={onSelectAll}
                        />
                    </TableCell>
                    {COLUMNS.map((col) => (
                        <TableCell
                            key={col.key}
                            sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                        >
                            <TableSortLabel
                                active={sortKey === col.key}
                                direction={sortKey === col.key ? sortDir : "asc"}
                                onClick={() => onSort(col.key)}
                            >
                                {col.label}
                            </TableSortLabel>
                        </TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                        操作
                    </TableCell>
                </TableRow>
            )}
            itemContent={(_, cert) => (
                <>
                    <TableCell padding="checkbox">
                        <Checkbox
                            size="small"
                            checked={selected.has(cert.id)}
                            onChange={() => onToggle(cert.id)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </TableCell>
                    {COLUMNS.map((col) => (
                        <TableCell
                            key={col.key}
                            sx={
                                col.clip
                                    ? {
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                          maxWidth: col.clip,
                                      }
                                    : { whiteSpace: "nowrap" }
                            }
                        >
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
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(cert);
                            }}
                        >
                            编辑
                        </Button>
                    </TableCell>
                </>
            )}
        />
    );
}
