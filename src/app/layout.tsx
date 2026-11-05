import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deka Search | ระบบสืบค้นคำพิพากษาศาลฎีกา",
  description: "ระบบสืบค้นคำพิพากษา คำสั่งคำร้องและคำวินิจฉัยศาลฎีกา",
};

export const viewport = {
  themeColor: "#0ea5e9",
};

import { auth } from "@/auth";
import Navbar from "@/components/Navbar";
import ThemeInitializer from "@/components/ThemeInitializer";
import Providers from "@/components/Providers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="th" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col font-thai bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
        <Providers session={session}>
          <ThemeInitializer />
          <Navbar session={session} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
