import logoAsset from "@/assets/spark-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function SparkLogo({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Spark logo"
      className={cn("h-7 w-7 object-contain mix-blend-multiply dark:invert", className)}
    />
  );
}

export function SparkWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <SparkLogo />
      <span className="font-display text-lg font-bold tracking-tight">Spark</span>
    </span>
  );
}
