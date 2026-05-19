import { useState } from "react";
import type { StateSnapshot } from "react-virtuoso";

/**
 * Persists and restores the table's scroll position across editor navigation.
 *
 * Before navigating to the editor, call `virtuosoRef.current.getState(saveState)`.
 * On the way back, `initialState` is passed to Virtuoso's `restoreStateFrom` prop
 * so it reconstructs the exact virtual window that was visible before.
 */
export function useScrollRestore() {
    const [initialState] = useState<StateSnapshot | undefined>(() => {
        const saved = sessionStorage.getItem("certListState");
        if (!saved) return undefined;
        sessionStorage.removeItem("certListState");
        return JSON.parse(saved) as StateSnapshot;
    });

    const saveState = (state: StateSnapshot) => {
        sessionStorage.setItem("certListState", JSON.stringify(state));
    };

    return { initialState, saveState };
}
