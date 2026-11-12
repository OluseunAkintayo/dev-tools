import type React from "react";

/** Staggered entrance for the hero, played once on load. */
export const rise = (index: number): React.CSSProperties => ({ animationDelay: `${index * 60}ms` });
