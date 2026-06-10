import type { Config } from "tailwindcss";

// teamlet 시맨틱 색 토큰 → CSS 변수(teamlet-design.css 의 --color-*) 매핑.
// 이걸로 teamlet 컴포넌트의 Tailwind 유틸(text-foreground, bg-info-50 ...)이 TW3 에서도 동작.
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        "background-primary": "var(--color-background-primary)",
        "background-secondary": "var(--color-background-secondary)",
        "background-muted": "var(--color-background-muted)",
        foreground: "var(--color-foreground)",
        "foreground-muted": "var(--color-foreground-muted)",
        "foreground-subtle": "var(--color-foreground-subtle)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        primary: "var(--color-primary)",
        accent: "var(--color-accent)",
        "success-50": "var(--color-success-50)",
        "success-100": "var(--color-success-100)",
        "success-500": "var(--color-success-500)",
        "success-700": "var(--color-success-700)",
        "warning-50": "var(--color-warning-50)",
        "warning-100": "var(--color-warning-100)",
        "warning-200": "var(--color-warning-200)",
        "warning-500": "var(--color-warning-500)",
        "warning-700": "var(--color-warning-700)",
        "info-50": "var(--color-info-50)",
        "info-100": "var(--color-info-100)",
        "info-500": "var(--color-info-500)",
        "info-700": "var(--color-info-700)",
        "destructive-50": "var(--color-destructive-50)",
        "destructive-100": "var(--color-destructive-100)",
        "destructive-500": "var(--color-destructive-500)",
        "destructive-600": "var(--color-destructive-600)",
        "destructive-700": "var(--color-destructive-700)",
      },
    },
  },
  plugins: [],
} satisfies Config;
