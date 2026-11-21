import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "SpectriX AI – Surveillance Dashboard",
  description: "Real-time AI-powered security surveillance by SpectriX",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark" suppressHydrationWarning>
      <body
        className="min-h-full bg-[#020617] text-slate-100"
        suppressHydrationWarning
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
