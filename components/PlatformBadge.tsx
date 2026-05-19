import type { Platform } from "../lib/types";

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; textColor: string; dot: string; live: boolean }> = {
  blinkit:    { label: "Blinkit",    color: "bg-green-100",  textColor: "text-green-800",  dot: "bg-green-500",  live: false },
  bigbasket:  { label: "BigBasket",  color: "bg-red-100",    textColor: "text-red-800",    dot: "bg-red-500",    live: true  },
  zepto:      { label: "Zepto",      color: "bg-purple-100", textColor: "text-purple-800", dot: "bg-purple-500", live: true  },
};

interface PlatformBadgeProps {
  platform: Platform;
  size?: "sm" | "md";
  showLiveStatus?: boolean;
}

export function PlatformBadge({ platform, size = "md", showLiveStatus = false }: PlatformBadgeProps) {
  const config = PLATFORM_CONFIG[platform];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${config.textColor} ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
      {showLiveStatus && !config.live && (
        <span className="text-[10px] opacity-60 font-normal">est.</span>
      )}
    </span>
  );
}
