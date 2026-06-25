"use client";

import * as React from "react";

/**
 * Measure an element's content height (via ResizeObserver) so a fixed-height
 * Recharts chart can fill a flex/grid cell exactly. The redesign's no-scroll
 * canvases size their charts to whatever vertical space remains, at any
 * viewport. Returns `[ref, height]`; height is `0` until the first measure.
 */
export function useAutoHeight<T extends HTMLElement = HTMLDivElement>() {
  const ref = React.useRef<T>(null);
  const [height, setHeight] = React.useState(0);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, height] as const;
}
