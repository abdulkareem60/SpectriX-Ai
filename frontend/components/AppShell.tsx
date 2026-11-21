"use client";

import { AuthProvider } from "./AuthProvider";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-[#020617]">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopHeader />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
