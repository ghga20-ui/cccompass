import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "범용 선택과목 도우미",
  description: "학교 편제표 업로드 기반 선택과목 도우미",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
