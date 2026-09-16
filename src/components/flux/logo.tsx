import logoAsset from "@/assets/flux-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function FluxLogo({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Flux logo"
      className={cn("h-7 w-7 object-contain mix-blend-multiply dark:invert", className)}
    />
  );
}

export function FluxWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <FluxLogo />
      <span className="font-display text-lg font-bold tracking-tight">Flux</span>
    </span>
  );
}
