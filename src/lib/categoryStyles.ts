import type { CategoryId } from "@/lib/tools";

interface CategoryStyle {
  text: string;
  badge: string;
  icon: string;
}

/** Full class names so Tailwind sees them. They read --cat-* from src/tw.css, so each theme gets its own hue. */
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
  compare: {
    text: "text-[hsl(var(--cat-compare))]",
    badge: "border-[hsl(var(--cat-compare)/0.25)] bg-[hsl(var(--cat-compare)/0.1)] text-[hsl(var(--cat-compare))]",
    icon: "bg-[hsl(var(--cat-compare)/0.1)] text-[hsl(var(--cat-compare))]",
  },
  test: {
    text: "text-[hsl(var(--cat-test))]",
    badge: "border-[hsl(var(--cat-test)/0.25)] bg-[hsl(var(--cat-test)/0.1)] text-[hsl(var(--cat-test))]",
    icon: "bg-[hsl(var(--cat-test)/0.1)] text-[hsl(var(--cat-test))]",
  },
  design: {
    text: "text-[hsl(var(--cat-design))]",
    badge: "border-[hsl(var(--cat-design)/0.25)] bg-[hsl(var(--cat-design)/0.1)] text-[hsl(var(--cat-design))]",
    icon: "bg-[hsl(var(--cat-design)/0.1)] text-[hsl(var(--cat-design))]",
  },
};
