"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Monitor, AlertTriangle, Settings, LogOut, Eye } from "lucide-react";

const navItems = [
  { label: "Live Monitoring", href: "/", icon: Monitor },
  { label: "Incidents", href: "/incidents", icon: AlertTriangle },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    // Logout slot — ready for Firebase Auth signout
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <aside
      className="flex flex-col w-60 shrink-0 h-screen sticky top-0
                 bg-[#0a0f1e] border-r border-slate-800 z-20"
    >
      {/* Branding */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg
                     bg-cyan-500/15 border border-cyan-500/40
                     shadow-[0_0_12px_rgba(34,211,238,0.25)]"
        >
          <Eye size={18} className="text-cyan-400" />
        </div>
        <div>
          <span className="block text-sm font-bold tracking-wide text-white">
            SpectriX AI
          </span>
          <span className="block text-[10px] text-slate-400 tracking-widest uppercase">
            Surveillance Dashboard
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${
                  isActive
                    ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.12)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                }`}
            >
              <span className="flex items-center gap-3">
                <Icon size={16} className="shrink-0" />
                {label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium
                     text-slate-400 hover:text-red-400 hover:bg-red-900/20
                     border border-transparent transition-all duration-150"
        >
          <LogOut size={16} className="shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
