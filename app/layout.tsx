import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CAREERON | Discover Your Career",
    template: "%s | CAREERON",
  },
  description: "진로 탐색부터 취업 준비까지, 커리어의 모든 순간을 함께합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
