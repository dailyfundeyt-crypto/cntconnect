import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  Heart,
  Info,
  Moon,
  ShieldAlert,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getLocalData,
  setLocalAndSyncData,
  pullFromSupabase,
} from "@/lib/storage-sync";

export const Route = createFileRoute("/_authenticated/app/health")({
  head: () => ({
    meta: [
      { title: "Gesundheit & Bio-Tracking — Spark" },
      { name: "description", content: "Nährstoff-Protokoll, Trifecta und Bio-Tracking auf Basis verifizierter Naturheilkunde." },
    ],
  }),
  component: HealthPage,
});

interface HealthState {
  weightKg: number;
  energyLevel: number;
  waterLiters: number;
  notes: string;
  checkedSupplements: Record<string, boolean>;
}

export function HealthPage() {
  const [todayStr] = useState<string>(
    new Date().toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  );

  const [state, setState] = useState<HealthState>(() => {
    return getLocalData<HealthState>("spark_health", {
      weightKg: 75,
      energyLevel: 8,
      waterLiters: 2.5,
      notes: "",
      checkedSupplements: {},
    });
  });

  useEffect(() => {
    void pullFromSupabase<HealthState>("spark_health", state).then((remote) => {
      if (remote) setState(remote);
    });
  }, []);

  function updateState(partial: Partial<HealthState>) {
    const updated = { ...state, ...partial };
    setState(updated);
    setLocalAndSyncData("spark_health", updated);
  }

  function toggleSupplement(id: string) {
    const nextChecked = {
      ...state.checkedSupplements,
      [id]: !state.checkedSupplements[id],
    };
    updateState({ checkedSupplements: nextChecked });
    toast.success("Einnahme aktualisiert");
  }

  // Calculated dosages based on weight from Gesundheit.txt
  // (1000 IE D3 per 7kg weight, 20 µg K2 per 1000 IE D3)
  const calculatedD3 = Math.round((state.weightKg / 7) * 1000);
  const calculatedK2 = Math.round((calculatedD3 / 1000) * 20);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-500/20 mb-2">
            <Heart className="h-3.5 w-3.5" /> Naturgesundheit & Nährstoffe
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Gesundheit & Bio-Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {todayStr} — Verifiziertes Protokoll nach natürlichen Standards (Fabian Kowallik / Gesundheit.txt).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-2 text-right shadow-panel">
            <span className="text-xs text-muted-foreground block">Körpergewicht</span>
            <div className="flex items-center gap-1.5 justify-end">
              <input
                type="number"
                value={state.weightKg}
                onChange={(e) => updateState({ weightKg: Number(e.target.value) || 70 })}
                className="w-14 text-sm font-bold text-foreground bg-transparent text-right outline-none border-b border-dashed border-border"
              />
              <span className="text-xs font-mono text-muted-foreground">kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Basis: Das Trifecta (Muss-Kombination) */}
      <div className="rounded-xl border border-accent/30 bg-card p-6 shadow-panel space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Die absolute Basis: Das „Trifecta“
            </h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
            Tägliche Synergie-Pflicht
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Vitamin D3 wirkt wie ein Hormon und steuert das Immunsystem. Um gefährliche Arterienverkalkung (Hyperkalzämie) zu verhindern, muss es <strong>zwingend mit Vitamin K2</strong> (zur Kalzium-Lenkung in Knochen) und <strong>Magnesium</strong> (zur enzymatischen Aktivierung in der Leber) kombiniert werden.
        </p>

        <div className="grid gap-3 sm:grid-cols-3 pt-2">
          {/* D3 */}
          <div
            onClick={() => toggleSupplement("d3")}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              state.checkedSupplements["d3"]
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-border bg-secondary/20 hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display font-medium text-sm text-foreground">Vitamin D3</span>
              <div
                className={`h-5 w-5 rounded flex items-center justify-center border ${
                  state.checkedSupplements["d3"]
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-border bg-card"
                }`}
              >
                {state.checkedSupplements["d3"] && <Check className="h-3.5 w-3.5" />}
              </div>
            </div>
            <div className="mt-2 text-xs font-mono text-accent font-semibold">
              ca. {calculatedD3.toLocaleString("de-DE")} IE
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Ziel: 50–80 ng/ml Blutwert. (1.000 IE je 7 kg Körpergewicht). Niemals isoliert ohne K2 nehmen.
            </p>
          </div>

          {/* K2 */}
          <div
            onClick={() => toggleSupplement("k2")}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              state.checkedSupplements["k2"]
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-border bg-secondary/20 hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display font-medium text-sm text-foreground">Vitamin K2 (MK-7)</span>
              <div
                className={`h-5 w-5 rounded flex items-center justify-center border ${
                  state.checkedSupplements["k2"]
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-border bg-card"
                }`}
              >
                {state.checkedSupplements["k2"] && <Check className="h-3.5 w-3.5" />}
              </div>
            </div>
            <div className="mt-2 text-xs font-mono text-accent font-semibold">
              ca. {calculatedK2} µg
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Transportiert Kalzium aus den Gefäßen direkt in Knochen und Zähne. Proportional zu D3 einnehmen.
            </p>
          </div>

          {/* Magnesium */}
          <div
            onClick={() => toggleSupplement("magnesium")}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              state.checkedSupplements["magnesium"]
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-border bg-secondary/20 hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display font-medium text-sm text-foreground">Magnesium (Bioaktiv)</span>
              <div
                className={`h-5 w-5 rounded flex items-center justify-center border ${
                  state.checkedSupplements["magnesium"]
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-border bg-card"
                }`}
              >
                {state.checkedSupplements["magnesium"] && <Check className="h-3.5 w-3.5" />}
              </div>
            </div>
            <div className="mt-2 text-xs font-mono text-accent font-semibold">
              Citrat (morgens) / Bisglycinat (abends)
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Morgens 400 mg Citrat (Verdauung), abends 200 mg Bisglycinat (Schlaf & Muskeln). Kein Oxid/Carbonat!
            </p>
          </div>
        </div>
      </div>

      {/* Gehirn, Herz & Entzündungen */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          <span>Fokus, Gehirn & Zellschutz</span>
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {[
            {
              id: "omega3",
              name: "Omega-3 (Algenöl)",
              dose: "1 TL / 2 Kapseln",
              notes: "Ausschließlich reines Algenöl. Fischölkapseln sind oft oxidiert (ranzig) und schwermetallbelastet.",
            },
            {
              id: "nigella",
              name: "Schwarzkümmelöl",
              dose: "1 TL (Thymochinon)",
              notes: "Potent gegen stille Entzündungen, reguliert Blutzucker, schützt die Atemwege.",
            },
            {
              id: "astaxanthin",
              name: "Astaxanthin",
              dose: "4–8 mg",
              notes: "6.000x stärker als Vitamin C. Sonnenschutz von innen und Schutz vor vorzeitiger Zellalterung.",
            },
            {
              id: "creatine",
              name: "Kreatin Monohydrat",
              dose: "5 g mit Meersalz",
              notes: "ATP-Energie fürs Gehirn & Muskeln. Zwingend mit Salz/Elektrolyten für optimalen Zelltransport.",
            },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => toggleSupplement(item.id)}
              className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                state.checkedSupplements[item.id]
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-foreground">{item.name}</span>
                <div
                  className={`h-4 w-4 rounded flex items-center justify-center border ${
                    state.checkedSupplements[item.id]
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-border bg-card"
                  }`}
                >
                  {state.checkedSupplements[item.id] && <Check className="h-3 w-3" />}
                </div>
              </div>
              <div className="mt-1 text-[11px] font-mono text-accent font-semibold">{item.dose}</div>
              <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{item.notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Schlaf, Darm & Regeneration */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Moon className="h-5 w-5 text-accent" />
          <span>Darm, Schlaf & Bindegewebe</span>
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              id: "collagen",
              name: "Weidekollagen",
              dose: "10 g (morgens/abends)",
              notes: "Darmschleimhaut, Gelenke & Haut. Enthält Glycin, das abends den Harndrang dämpft.",
            },
            {
              id: "liver",
              name: "Rinderleber-Kapseln",
              dose: "3–6 Kapseln",
              notes: "Natürliche Matrix für Eisen, Kupfer, Retinol und B-Vitamine statt synthetischem 'Fahrradrost'.",
            },
            {
              id: "psyllium",
              name: "Flohsamenschalen",
              dose: "5 g in großem Glas Wasser",
              notes: "Nimmt im Darm Giftstoffe, Gallensäuren und Biofilm auf und scheidet sie sanft aus.",
            },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => toggleSupplement(item.id)}
              className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                state.checkedSupplements[item.id]
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-foreground">{item.name}</span>
                <div
                  className={`h-4 w-4 rounded flex items-center justify-center border ${
                    state.checkedSupplements[item.id]
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-border bg-card"
                  }`}
                >
                  {state.checkedSupplements[item.id] && <Check className="h-3 w-3" />}
                </div>
              </div>
              <div className="mt-1 text-[11px] font-mono text-accent font-semibold">{item.dose}</div>
              <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{item.notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rote Flaggen: Warnungen aus Gesundheit.txt */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 shadow-panel space-y-3">
        <div className="flex items-center gap-2 text-destructive font-display font-semibold text-sm">
          <ShieldAlert className="h-5 w-5" />
          <span>Wichtige Sicherheitswarnungen (Niemals isoliert oder synthetisch einnehmen!)</span>
        </div>

        <div className="grid gap-2 text-xs text-foreground/80 sm:grid-cols-2">
          <div className="rounded border border-destructive/20 bg-card/60 p-2.5">
            <span className="font-bold text-destructive">Synthetische Folsäure:</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Ca. 50 % der Bevölkerung hat einen MTHFR-Gendefekt und kann synthetische Folsäure nicht verarbeiten. Unverarbeitet kann sie Krebsrisiken erhöhen. Immer bioaktives <strong>Methylfolat</strong> wählen.
            </p>
          </div>

          <div className="rounded border border-destructive/20 bg-card/60 p-2.5">
            <span className="font-bold text-destructive">Synthetisches B12 (Cyanocobalamin):</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Enthält eine toxische Cyanid-Verbindung und entzieht dem Körper das lebenswichtige Antioxidans Glutathion. Nur <strong>Methylcobalamin</strong> oder <strong>Adenosylcobalamin</strong> nutzen.
            </p>
          </div>

          <div className="rounded border border-destructive/20 bg-card/60 p-2.5">
            <span className="font-bold text-destructive">Synthetisches Eisen (Eisensulfat):</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Wirkt im Darm stark oxidativ („Fahrradrost“) und begünstigt Entzündungen. Eisenbedarf nur aus echten Nahrungsmitteln (wie Rinderleber oder Weidefleisch) decken.
            </p>
          </div>

          <div className="rounded border border-destructive/20 bg-card/60 p-2.5">
            <span className="font-bold text-destructive">Calciumcarbonat:</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Zerkleinerter Kalkstein, der Nierensteine und Plaque in Gefäßen fördert. Kalziumbedarf über echte Nahrung (z. B. Rohmilchkäse) mit Vitamin K2 decken.
            </p>
          </div>
        </div>
      </div>

      {/* Tägliche Notizen & Vitalität */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-panel space-y-4">
        <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Award className="h-4 w-4 text-accent" />
          <span>Tägliches Wohlbefinden & Hydration</span>
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <Label>Energie-Level (1–10)</Label>
              <span className="font-mono font-bold text-accent">{state.energyLevel}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={state.energyLevel}
              onChange={(e) => updateState({ energyLevel: Number(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <Label>Wasseraufnahme mit Elektrolyten</Label>
              <span className="font-mono font-bold text-accent">{state.waterLiters} Liter</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={state.waterLiters}
              onChange={(e) => updateState({ waterLiters: Number(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Persönliche Tagesnotiz / Befinden</Label>
          <Input
            value={state.notes}
            onChange={(e) => updateState({ notes: e.target.value })}
            placeholder="Ernährung heute, Schlafqualität, Fastendauer..."
            className="text-sm"
          />
        </div>
      </div>
    </div>
  );
}
