import type { Metadata, Viewport } from "next";
import { Black_Han_Sans, Noto_Sans_KR, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// 워드마크('과목나침반') 전용 — 굵고 임팩트 있는 디스플레이체.
const blackHanSans = Black_Han_Sans({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "과목나침반",
  description: "학교 편제표를 올리면 학생 맞춤 선택과목 안내·진로 추천·수강 로드맵을 만들어 주는 서비스",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FFFBEB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSansKR.variable} ${plusJakartaSans.variable} ${blackHanSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
