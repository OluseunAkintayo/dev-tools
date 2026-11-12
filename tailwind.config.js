/** @type {import('tailwindcss').Config} */
import animate from "tailwindcss-animate";

const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  prefix: "",
  // Only apply hover styles on devices that can actually hover (no sticky hover on touch).
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Geist Variable"', "system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
        mono: ['"Geist Mono Variable"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Design tokens (see src/tw.css)
        paper: token("paper"),
        surface: token("surface"),
        sunken: token("sunken"),
        gutter: token("gutter"),
        feature: token("feature"),
        ink: {
          DEFAULT: token("ink"),
          2: token("ink-2"),
          3: token("ink-3"),
          4: token("ink-4"),
        },
        line: {
          DEFAULT: token("line"),
          strong: token("line-strong"),
        },
        brand: token("brand"),
        warn: token("warn"),
        "code-blue": token("code-blue"),

        // shadcn/ui aliases, mapped onto the tokens above
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        background: token("background"),
        foreground: token("foreground"),
        primary: {
          DEFAULT: token("primary"),
          foreground: token("primary-foreground"),
        },
        secondary: {
          DEFAULT: token("secondary"),
          foreground: token("secondary-foreground"),
        },
        destructive: {
          DEFAULT: token("destructive"),
          foreground: token("destructive-foreground"),
        },
        muted: {
          DEFAULT: token("muted"),
          foreground: token("muted-foreground"),
        },
        accent: {
          DEFAULT: token("accent"),
          foreground: token("accent-foreground"),
        },
        popover: {
          DEFAULT: token("popover"),
          foreground: token("popover-foreground"),
        },
        card: {
          DEFAULT: token("card"),
          foreground: token("card-foreground"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      boxShadow: {
        lift: "0 1px 2px hsl(var(--shadow) / 0.05), 0 8px 24px -12px hsl(var(--shadow) / 0.16)",
        float: "0 0 0 1px hsl(var(--line-strong)), 0 24px 48px -12px hsl(var(--shadow) / 0.3)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        rise: "rise 500ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "fade-in": "fade-in 200ms ease-out both",
      },
    },
  },
  plugins: [animate],
};
