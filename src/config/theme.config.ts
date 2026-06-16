export const theme = {
  colors: {
    primary: "#fbbc05",
    secondary: "#485470",
    background: "#ffffff",
    surface: "#ffffff",
    text: "#111827",
    muted: "#6b7280",
    border: "#e5e7eb",
    card: "#ffffff",
    success: "#15803d",
    danger: "#dc2626",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
  },
  shadows: {
    card: "0 10px 30px rgba(17, 24, 39, 0.08)",
    hover: "0 18px 48px rgba(17, 24, 39, 0.14)",
    header: "0 8px 24px rgba(17, 24, 39, 0.08)",
  },
  overlays: {
    hero: "linear-gradient(90deg, rgba(17, 24, 39, 0.76), rgba(72, 84, 112, 0.48), rgba(17, 24, 39, 0.08))",
  },
  layout: {
    container: "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10",
    section: "py-12 sm:py-16 lg:py-20",
    compactSection: "py-8 sm:py-10 lg:py-12",
    gridGap: "gap-4 sm:gap-5 lg:gap-6",
  },
};

export type ThemeConfig = typeof theme;
