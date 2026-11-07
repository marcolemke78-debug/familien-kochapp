import { BadgeCheck, CookingPot, Fan, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEVICE_STATUS, deviceShort, type Device, type DeviceStatus } from "@/lib/recipe-meta";

const ICONS = { tm6: CookingPot, airfryer: Fan } as const;

type DeviceBadgeProps = {
  device: Device;
  status: DeviceStatus;
  showStatus?: boolean; // in der Liste nur das Gerät, auf der Rezeptseite mit Status
  className?: string;
};

// Pille wie "TM6 · getestet". Getestet bekommt einen Haken, KI-Vorschläge ein Funkeln.
export function DeviceBadge({ device, status, showStatus = false, className }: DeviceBadgeProps) {
  const Icon = ICONS[device];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1 text-sm font-semibold text-foreground shadow-float backdrop-blur-sm",
        className,
      )}
    >
      <Icon className="size-4 text-primary" aria-hidden />
      {deviceShort(device)}
      {showStatus && (
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium",
            status === "getestet" ? "text-[#1f7a4d] dark:text-[#6fd3a0]" : "text-muted-foreground",
          )}
        >
          <span aria-hidden>·</span>
          {status === "getestet" && <BadgeCheck className="size-4" aria-hidden />}
          {status === "ki" && <Sparkles className="size-4" aria-hidden />}
          {DEVICE_STATUS[status]}
        </span>
      )}
    </span>
  );
}
