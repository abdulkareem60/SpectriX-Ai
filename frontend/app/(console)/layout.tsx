import AppShell from "@/components/AppShell";

/** Signed-in area: sidebar, header and the operator pages (dashboard, incidents, settings). */
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
