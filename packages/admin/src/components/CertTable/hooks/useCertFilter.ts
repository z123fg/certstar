import { useState, useMemo, useEffect } from "react";
import { certTypeMap, toChineseDate } from "@certstar/shared";
import type { Cert } from "../../../types";
import intl from "../../../intl/intl";

export type SortDir = "asc" | "desc";

export interface Filters {
    certType: string[];
    expDateFrom: string;
    expDateTo: string;
    createdAtFrom: string;
    createdAtTo: string;
    updatedAtFrom: string;
    updatedAtTo: string;
}

export const EMPTY_FILTERS: Filters = {
    certType: [],
    expDateFrom: "",
    expDateTo: "",
    createdAtFrom: "",
    createdAtTo: "",
    updatedAtFrom: "",
    updatedAtTo: "",
};

/** Shared between the filter form and the active-chip label builder. */
export const DATE_RANGE_FILTERS = [
    { label: intl.expDate, from: "expDateFrom" as const, to: "expDateTo" as const },
    { label: "创建时间", from: "createdAtFrom" as const, to: "createdAtTo" as const },
    { label: "更新时间", from: "updatedAtFrom" as const, to: "updatedAtTo" as const },
];

export const certTypeLabel = (code: string): string =>
    certTypeMap[code as keyof typeof certTypeMap] ?? code;

// ── Session persistence ──────────────────────────────────────────────────────

const STORAGE_KEY = "certListFilterState";

interface PersistedState {
    keyword: string;
    sortKey: keyof Cert;
    sortDir: SortDir;
    filters: Filters;
}

function loadState(): Partial<PersistedState> {
    try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        return saved ? (JSON.parse(saved) as Partial<PersistedState>) : {};
    } catch {
        return {};
    }
}

// ────────────────────────────────────────────────────────────────────────────

export function useCertFilter(certs: Cert[]) {
    const [keyword, setKeyword] = useState<string>(() => loadState().keyword ?? "");
    const [sortKey, setSortKey] = useState<keyof Cert>(() => loadState().sortKey ?? "expDate");
    const [sortDir, setSortDir] = useState<SortDir>(() => loadState().sortDir ?? "desc");
    const [filters, setFilters] = useState<Filters>(() => loadState().filters ?? EMPTY_FILTERS);

    // Keep sessionStorage in sync so state survives navigation within the tab.
    useEffect(() => {
        const state: PersistedState = { keyword, sortKey, sortDir, filters };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [keyword, sortKey, sortDir, filters]);

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

    const filtered = useMemo(
        () =>
            certs
                .filter(
                    (c) =>
                        !keyword ||
                        [c.name, c.idNum, c.certNum, c.organization, c.issuingAgency].some((v) =>
                            v?.toLowerCase().includes(keyword.toLowerCase()),
                        ),
                )
                .filter(
                    (c) => filters.certType.length === 0 || filters.certType.includes(c.certType),
                )
                .filter(
                    (c) =>
                        !filters.expDateFrom ||
                        toChineseDate(c.expDate) >= filters.expDateFrom,
                )
                .filter(
                    (c) =>
                        !filters.expDateTo || toChineseDate(c.expDate) <= filters.expDateTo,
                )
                .filter(
                    (c) =>
                        !filters.createdAtFrom ||
                        toChineseDate(c.createdAt) >= filters.createdAtFrom,
                )
                .filter(
                    (c) =>
                        !filters.createdAtTo ||
                        toChineseDate(c.createdAt) <= filters.createdAtTo,
                )
                .filter(
                    (c) =>
                        !filters.updatedAtFrom ||
                        toChineseDate(c.updatedAt) >= filters.updatedAtFrom,
                )
                .filter(
                    (c) =>
                        !filters.updatedAtTo ||
                        toChineseDate(c.updatedAt) <= filters.updatedAtTo,
                )
                .sort((a, b) => {
                    const av = String(a[sortKey] ?? "");
                    const bv = String(b[sortKey] ?? "");
                    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
                }),
        [certs, keyword, filters, sortKey, sortDir],
    );

    const activeFilterCount =
        (filters.certType.length > 0 ? 1 : 0) +
        (filters.expDateFrom || filters.expDateTo ? 1 : 0) +
        (filters.createdAtFrom || filters.createdAtTo ? 1 : 0) +
        (filters.updatedAtFrom || filters.updatedAtTo ? 1 : 0);

    const activeChips: { label: string; onDelete: () => void }[] = [
        ...filters.certType.map((code) => ({
            label: `${intl.certType}: ${certTypeLabel(code)}`,
            onDelete: () => setFilter("certType", filters.certType.filter((c) => c !== code)),
        })),
        ...DATE_RANGE_FILTERS.flatMap(({ label, from, to }) =>
            filters[from] || filters[to]
                ? [
                      {
                          label: `${label}: ${filters[from] || "…"} ~ ${filters[to] || "…"}`,
                          onDelete: () => setFilters((p) => ({ ...p, [from]: "", [to]: "" })),
                      },
                  ]
                : [],
        ),
    ];

    return {
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
    };
}
