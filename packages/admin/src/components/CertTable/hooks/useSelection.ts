import { useState } from "react";
import { flushSync } from "react-dom";
import type React from "react";

/**
 * Manages checkbox selection state.
 *
 * Uses flushSync + manual scrollTop restoration to prevent the virtualized
 * table from jumping to the top on each selection change (Virtuoso normally
 * recalculates layout on every React re-render).
 */
export function useSelection(scrollerRef: React.RefObject<HTMLDivElement | null>) {
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const handleToggle = (id: string) => {
        const top = scrollerRef.current?.scrollTop ?? 0;
        flushSync(() => {
            setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
        });
        if (scrollerRef.current) scrollerRef.current.scrollTop = top;
    };

    const handleSelectAll = (filteredIds: string[], allSelected: boolean) => {
        const top = scrollerRef.current?.scrollTop ?? 0;
        flushSync(() => {
            if (allSelected) {
                setSelected(new Set());
            } else {
                setSelected((prev) => new Set([...prev, ...filteredIds]));
            }
        });
        if (scrollerRef.current) scrollerRef.current.scrollTop = top;
    };

    const clearSelection = () => setSelected(new Set());

    return { selected, handleToggle, handleSelectAll, clearSelection };
}
