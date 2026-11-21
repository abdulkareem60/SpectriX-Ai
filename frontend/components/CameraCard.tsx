import StatusBadge from "./StatusBadge";
import { Camera, CameraOff, Loader } from "lucide-react";

export interface CameraInfo {
  id: string;
  name?: string;
  status: "ACTIVE" | "OFFLINE";
}

interface CameraCardProps {
  camera: CameraInfo;
}

export default function CameraCard({ camera }: CameraCardProps) {
  const isActive = camera.status === "ACTIVE";

  return (
    <div className="rounded-xl overflow-hidden
                    border border-slate-200 dark:border-slate-800
                    bg-white dark:bg-slate-900
                    flex flex-col">
      {/* Video Frame */}
      <div className="relative aspect-video bg-slate-200 dark:bg-slate-950 overflow-hidden">
        {/* Top-left: camera icon */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <Camera size={15} className="text-slate-400 dark:text-slate-500" />
        </div>

        {/* Top-right: status badge */}
        <div className="absolute top-2 right-2 z-10">
          <StatusBadge status={camera.status} />
        </div>

        {/* Center placeholder */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {isActive ? (
            <>
              <Loader size={22} className="text-slate-400 dark:text-slate-500 animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                Awaiting Vision Stream...
              </p>
            </>
          ) : (
            <>
              <CameraOff size={24} className="text-slate-400 dark:text-slate-600" />
              <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                No video input
              </p>
            </>
          )}
        </div>
      </div>

      {/* Bottom strip */}
      <div className="flex items-center justify-between px-3.5 py-2.5
                      bg-white dark:bg-slate-900
                      border-t border-slate-100 dark:border-slate-800/60">
        <p className="text-xs font-bold text-slate-800 dark:text-white leading-none">
          {camera.id}
        </p>
        <span
          className={`w-2 h-2 rounded-full ${isActive
              ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]"
              : "bg-slate-400 dark:bg-slate-500"
            }`}
        />
      </div>
    </div>
  );
}
