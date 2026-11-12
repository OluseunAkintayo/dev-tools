import type { CategoryId } from "@/lib/tools";

interface CategoryStyle {
  /** Coloured text (labels, icons). */
  text: string;
  /** Pill badge: tinted fill, tinted border, coloured text. */
  badge: string;
  /** Icon square: tinted fill, coloured glyph. */
  icon: string;
}

/**
 * Per-category colour classes, written out in full so Tailwind can see them.
 * They read the --cat-* variables from src/tw.css directly (arbitrary values),
 * so they don't depend on tailwind.config.js and each theme gets its own hue.
 */
export const categoryStyles: Record<CategoryId, CategoryStyle> = {
  format: {
    text: "text-[hsl(var(--cat-format))]",
    badge: "border-[hsl(var(--cat-format)/0.25)] bg-[hsl(var(--cat-format)/0.1)] text-[hsl(var(--cat-format))]",
    icon: "bg-[hsl(var(--cat-format)/0.1)] text-[hsl(var(--cat-format))]",
  },
  convert: {
    text: "text-[hsl(var(--cat-convert))]",
    badge: "border-[hsl(var(--cat-convert)/0.25)] bg-[hsl(var(--cat-convert)/0.1)] text-[hsl(var(--cat-convert))]",
    icon: "bg-[hsl(var(--cat-convert)/0.1)] text-[hsl(var(--cat-convert))]",
  },
  generate: {
    text: "text-[hsl(var(--cat-generate))]",
    badge: "border-[hsl(var(--cat-generate)/0.25)] bg-[hsl(var(--cat-generate)/0.1)] text-[hsl(var(--cat-generate))]",
    icon: "bg-[hsl(var(--cat-generate)/0.1)] text-[hsl(var(--cat-generate))]",
  },
  encode: {
    text: "text-[hsl(var(--cat-encode))]",
    badge: "border-[hsl(var(--cat-encode)/0.25)] bg-[hsl(var(--cat-encode)/0.1)] text-[hsl(var(--cat-encode))]",
    icon: "bg-[hsl(var(--cat-encode)/0.1)] text-[hsl(var(--cat-encode))]",
  },
  design: {
    text: "text-[hsl(var(--cat-design))]",
    badge: "border-[hsl(var(--cat-design)/0.25)] bg-[hsl(var(--cat-design)/0.1)] text-[hsl(var(--cat-design))]",
    icon: "bg-[hsl(var(--cat-design)/0.1)] text-[hsl(var(--cat-design))]",
  },
};
