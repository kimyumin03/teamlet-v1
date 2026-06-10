import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teamlet — 한국형 HR",
  description: "인사·조직·휴가·결재를 한 곳에서. axhub 위에서 동작하는 Teamlet HR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard — axhub 디자인 시스템 기본 폰트 (CDN) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
