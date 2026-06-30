"use client";

import * as React from "react";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * Scales its fixed-size child to the largest size that still fits its container
 * in BOTH dimensions (contain), then centres it. The container fills its parent
 * (h-full / w-full), so the diagram fills the available width and height without
 * ever overflowing — no scrolling, minimal empty space. Growth is capped for
 * very large containers. The child is measured at its natural size (offsetWidth
 * / offsetHeight ignore the transform), so the scale stays stable.
 */
export function FitBox({
  children,
  max = 2.4,
  min = 0.4,
}: {
  children: React.ReactNode;
  max?: number;
  min?: number;
}) {
  const outerRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState<number | null>(null);

  useIsoLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const availW = outer.clientWidth;
      const availH = outer.clientHeight;
      const naturalW = inner.offsetWidth;
      const naturalH = inner.offsetHeight;
      if (!availW || !availH || !naturalW || !naturalH) return;
      setScale(Math.max(min, Math.min(max, availW / naturalW, availH / naturalH)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [max, min]);

  return (
    <div ref={outerRef} className="relative h-full w-full overflow-hidden">
      <div
        ref={innerRef}
        className="absolute left-1/2 top-1/2 w-max"
        style={{
          transform:
            scale != null
              ? `translate(-50%, -50%) scale(${scale})`
              : "translate(-50%, -50%)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
