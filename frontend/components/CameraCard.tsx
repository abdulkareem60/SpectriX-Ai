import StatusBadge from "./StatusBadge";
import { CameraOff } from "lucide-react";

export interface CameraInfo {
  id: string;
  name?: string;
}

interface CameraCardProps {
  camera: CameraInfo;
}

/**
 * Placeholder tile. The backend has no camera or heartbeat endpoint yet, so the dashboard
 * cannot know whether a camera is online. Never show "active" or "live" here until it can.
 */
export default function CameraCard({ camera }: CameraCardProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col">
      <div className="relative aspect-video bg-slate-200 dark:bg-slate-950 overflow-hidden">
        <div className="absolute top-2 right-2 z-10">
          <StatusBadge status="SAMPLE" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <CameraOff size={22} className="text-slate-400 dark:text-slate-600" />
          <p className="text-xs text-slate-500 font-medium">No video or camera status yet</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-600">Needs a camera status endpoint in the API</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-slate-100 dark:border-slate-800/60">
        <p className="text-xs font-bold text-slate-800 dark:text-white leading-none">{camera.name ?? camera.id}</p>
        <span className="text-[10px] uppercase tracking-wider text-slate-400">Status unknown</span>
      </div>
    </div>
  );
}
