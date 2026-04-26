/**
 * LazyMount — render children only when the wrapper enters the
 * viewport (with a generous rootMargin). Used to defer heavy
 * R3F canvases (point clouds, postprocessing) until they matter.
 *
 * Once mounted, children stay alive: we trade a tiny bit of memory
 * for the guarantee that scrolling back never shows a blank frame.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export interface LazyMountProps {
  children: ReactNode;
  rootMargin?: string;
  /** Render this while the children are not mounted yet. */
  fallback?: ReactNode;
  /** Forwarded to the wrapper div. */
  className?: string;
  style?: CSSProperties;
}

export function LazyMount({
  children,
  rootMargin = "200px 0px",
  fallback = null,
  className,
  style,
}: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setMounted(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [mounted, rootMargin]);

  return (
    <div ref={ref} className={className} style={style}>
      {mounted ? children : fallback}
    </div>
  );
}
