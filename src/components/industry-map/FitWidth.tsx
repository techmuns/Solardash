"use client";

import * as React from "react";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * Scales its fixed-width child to exactly fill the available width: the diagram
 * grows to fill a wide container and shrinks to fit a narrow one, so it never
 * leaves big side margins and never needs horizontal scrolling. Growth is capped
 * so it doesn't become absurdly large on ultra-wide screens. The child is
 * measured at its natural size (offsetWidth ignores the transform), so the
 * scale stays stable across re-measurements.
 */
export function FitWidth({
  children,
  max = 2,
  min = 0.6,
}: {
  children: React.ReactNode;
  max?: number;
  min?: number;
}) {
  const outerRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState<{ scale: number; height: number } | null>(null);

  useIsoLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const naturalW = inner.offsetWidth;
      const naturalH = inner.offsetHeight;
      if (!naturalW) return;
      const avail = outer.clientWidth;
      const scale = Math.max(min, Math.min(max, avail / naturalW));
      setBox({ scale, height: naturalH * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [max, min]);

  return (
    <div
      ref={outerRef}
      className="w-full overflow-hidden"
      style={box ? { height: box.height } : undefined}
    >
      <div
        ref={innerRef}
        className="w-max"
        style={
          box
            ? { transform: `scale(${box.scale})`, transformOrigin: "top left" }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
