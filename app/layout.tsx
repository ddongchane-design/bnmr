import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Inter } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE_URL = "https://bnmr.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BMNR Treasury Dashboard",
    template: "%s | BMNR Dashboard",
  },
  description: "비트마인(BMNR) 이더리움 자산 현황 및 핵심 지표를 실시간으로 추적합니다. mNAV, NAV per Share, 스테이킹 수익, 트레저리 현황을 한눈에 확인하세요.",
  keywords: ["BMNR", "비트마인", "이더리움", "ETH", "트레저리", "mNAV", "암호화폐", "Bitmine", "ETH treasury"],
  authors: [{ name: "BMNR Dashboard" }],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "BMNR Treasury Dashboard",
    title: "BMNR Treasury Dashboard",
    description: "비트마인(BMNR) 이더리움 자산 현황 및 핵심 지표를 실시간으로 추적합니다.",
  },
  twitter: {
    card: "summary",
    title: "BMNR Treasury Dashboard",
    description: "비트마인(BMNR) 이더리움 자산 현황 및 핵심 지표를 실시간으로 추적합니다.",
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "google-adsense-account": "ca-pub-8574768875205211",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8574768875205211"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />
        {children}
      </body>
    </html>
  );
}
