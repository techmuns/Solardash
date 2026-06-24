"use client";

import * as React from "react";

/**
 * Per-page row-selection state for compare mode. Tracks an ordered list of ids
 * (insertion order = the order the user picked them, which drives column order
 * and per-entity colour), capped at `max`. Selection is intentionally local —
 * it resets on navigation, which is the desired behaviour.
 */
export function useCompareSelection(max = 4) {
  const [selected, setSelected] = React.useState<string[]>([]);

  const isSelected = React.useCallback(
    (id: string) => selected.includes(id),
    [selected],
  );

  const toggle = React.useCallback(
    (id: string) => {
      setSelected((cur) =>
        cur.includes(id)
          ? cur.filter((x) => x !== id)
          : cur.length >= max
            ? cur
            : [...cur, id],
      );
    },
    [max],
  );

  const remove = React.useCallback(
    (id: string) => setSelected((cur) => cur.filter((x) => x !== id)),
    [],
  );

  const clear = React.useCallback(() => setSelected([]), []);

  return {
    selected,
    isSelected,
    /** True once the cap is hit — disable further unchecked checkboxes. */
    atMax: selected.length >= max,
    toggle,
    remove,
    clear,
  };
}
