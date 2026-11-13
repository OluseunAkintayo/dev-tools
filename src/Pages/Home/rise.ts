import type React from "react";

export const rise = (index: number): React.CSSProperties => ({ animationDelay: `${index * 60}ms` });
