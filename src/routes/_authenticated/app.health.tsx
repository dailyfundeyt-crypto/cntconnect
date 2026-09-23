import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Award,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  Dumbbell,
  Eye,
  Flame,
  Heart,
  Info,
  Moon,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Sun,
  Timer,
  Utensils,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLocalData, setLocalAndSyncData, pullFromSupabase } from "@/lib/storage-sync";

export const Route = createFileRoute("/_authenticated/app/health")({
  head: () => ({
    meta: [
      { title: "Gesundheit & Bio-Tracking — Spark" },
      {
        name: "description",
        content: "Bryan Johnson Blueprint & Fabian Kowallik Protokoll: Trifecta, Ergonomie, Mikrobewegungen und Bio-Tracking.",
      },
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
  checkedRoutines: Record<string, boolean>;
  checkedErgonomics: Record<string, boolean>;
}

const DEFAULT_HEALTH_STATE: HealthState = {
  weightKg: 75,
  energyLevel: 8,
  waterLiters: 2.5,
  notes: "",
  checkedSupplements: {},
  checkedRoutines: {},
  checkedErgonomics: {},
};

function sanitizeHealthState(raw: Partial<HealthState> | null | undefined): HealthState {
  return {
    weightKg: typeof raw?.weightKg === "number" && !isNaN(raw.weightKg) ? raw.weightKg : DEFAULT_HEALTH_STATE.weightKg,
    energyLevel: typeof raw?.energyLevel === "number" && !isNaN(raw.energyLevel) ? raw.energyLevel : DEFAULT_HEALTH_STATE.energyLevel,
    waterLiters: typeof raw?.waterLiters === "number" && !isNaN(raw.waterLiters) ? raw.waterLiters : DEFAULT_HEALTH_STATE.waterLiters,
    notes: typeof raw?.notes === "string" ? raw.notes : DEFAULT_HEALTH_STATE.notes,
    checkedSupplements: raw?.checkedSupplements && typeof raw.checkedSupplements === "object" ? { ...raw.checkedSupplements } : {},
    checkedRoutines: raw?.checkedRoutines && typeof raw.checkedRoutines === "object" ? { ...raw.checkedRoutines } : {},
    checkedErgonomics: raw?.checkedErgonomics && typeof raw.checkedErgonomics === "object" ? { ...raw.checkedErgonomics } : {},
  };
}

function HealthPage() {
  const [todayStr] = useState<string>(
    new Date().toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  );

  const [state, setState] = useState<HealthState>(() => {
    try {
      const raw = getLocalData<HealthState>("spark_health", DEFAULT_HEALTH_STATE);
      return sanitizeHealthState(raw);
    } catch {
      return DEFAULT_HEALTH_STATE;
    }
  });

  // Micro-Movement 5-Minute Timer (Bryan Johnson Blueprint)
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 mins = 300s
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void pullFromSupabase<HealthState>("spark_health", state).then((remote) => {
      if (remote) setState(sanitizeHealthState(remote));
    });
  }, []);

  // Timer tick
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setIsTimerRunning(false);
            toast.success("🔔 5-Minuten Mikrobewegung beendet! Dein Kreislauf ist aktiviert.");
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  function updateState(partial: Partial<HealthState>) {
    const updated = sanitizeHealthState({ ...state, ...partial });
    setState(updated);
    setLocalAndSyncData("spark_health", updated);
  }

  function toggleSupplement(id: string) {
    const current = state.checkedSupplements || {};
    const nextChecked = {
      ...current,
      [id]: !current[id],
    };
    updateState({ checkedSupplements: nextChecked });
    toast.success("Einnahme aktualisiert");
  }

  function toggleRoutine(id: string) {
    const current = state.checkedRoutines || {};
    const nextChecked = {
      ...current,
      [id]: !current[id],
    };
    updateState({ checkedRoutines: nextChecked });
    toast.success("Routine aktualisiert");
  }

  function toggleErgonomics(id: string) {
    const current = state.checkedErgonomics || {};
    const nextChecked = {
      ...current,
      [id]: !current[id],
    };
    updateState({ checkedErgonomics: nextChecked });
    toast.success("Ergonomie aktualisiert");
  }

  // Calculated dosages based on weight from Gesundheit.txt (Kowallik)
  // 1.000 IE D3 je 7 kg Gewicht; 20 µg K2 je 1.000 IE D3
  const safeWeight = state.weightKg && !isNaN(state.weightKg) ? state.weightKg : 70;
  const calculatedD3 = Math.round((safeWeight / 7) * 1000);
  const calculatedK2 = Math.round((calculatedD3 / 1000) * 20);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-500/20 mb-2">
            <Heart className="h-3.5 w-3.5" /> Bryan Johnson Blueprint & Fabian Kowallik Naturprotokoll
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Gesundheit & Bio-Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {todayStr} — Verifiziertes Protokoll: Trifecta, Mikrobewegungen, Ergonomie und Nährstoff-Synergien.
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

      {/* -------------------- 1. DAS TRIFECTA (MUSS-KOMBINATION) -------------------- */}
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
          Vitamin D3 wirkt hormonell und steuert das Immunsystem. Um gefährliche Arterienverkalkung (Hyperkalzämie) zu verhindern, muss es <strong>zwingend mit Vitamin K2</strong> (zur Kalzium-Lenkung in Knochen) und <strong>Magnesium</strong> (zur enzymatischen Aktivierung in der Leber) kombiniert werden.
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

      {/* -------------------- 2. BRYAN JOHNSON BLUEPRINT: ERGONOMIE & MIKROBEWEGUNG -------------------- */}
      <div className="rounded-xl border border-blue-500/30 bg-card p-6 shadow-panel space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Bryan Johnson Blueprint: Ergonomie & Haltung
            </h2>
          </div>
          <span className="text-xs font-mono text-blue-700 bg-blue-500/10 px-2 py-0.5 rounded">
            Postural Alignment & Movement
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Faden-Trick */}
          <div
            onClick={() => toggleErgonomics("thread_trick")}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              state.checkedErgonomics["thread_trick"]
                ? "border-blue-500/40 bg-blue-500/5"
                : "border-border bg-card hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs text-foreground">Der „Faden-Trick“</span>
              <div
                className={`h-4 w-4 rounded flex items-center justify-center border ${
                  state.checkedErgonomics["thread_trick"]
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-border bg-card"
                }`}
              >
                {state.checkedErgonomics["thread_trick"] && <Check className="h-3 w-3" />}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
              Stelle dir einen unsichtbaren Faden vor, der an deinem Scheitel befestigt ist und deinen Kopf sanft nach oben zieht. Kinn leicht anziehen, Schultern sinken lassen.
            </p>
          </div>

          {/* Monitor Augenhöhe */}
          <div
            onClick={() => toggleErgonomics("eye_level")}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              state.checkedErgonomics["eye_level"]
                ? "border-blue-500/40 bg-blue-500/5"
                : "border-border bg-card hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs text-foreground">Monitor-Oberkante auf Augenhöhe</span>
              <div
                className={`h-4 w-4 rounded flex items-center justify-center border ${
                  state.checkedErgonomics["eye_level"]
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-border bg-card"
                }`}
              >
                {state.checkedErgonomics["eye_level"] && <Check className="h-3 w-3" />}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
              Verhindert Tech-Neck (Nackendehnung). Ein Laptopständer oder Monitorarm entlastet die Halswirbel um bis zu 27 kg Zugkraft.
            </p>
          </div>

          {/* 20-20-20 Augenregel */}
          <div
            onClick={() => toggleErgonomics("eye_rule")}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              state.checkedErgonomics["eye_rule"]
                ? "border-blue-500/40 bg-blue-500/5"
                : "border-border bg-card hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs text-foreground">20-20-20 Augenentspannung</span>
              <div
                className={`h-4 w-4 rounded flex items-center justify-center border ${
                  state.checkedErgonomics["eye_rule"]
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-border bg-card"
                }`}
              >
                {state.checkedErgonomics["eye_rule"] && <Check className="h-3 w-3" />}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
              Alle 20 Minuten für 20 Sekunden in mindestens 6 Meter Entfernung blicken, um den Ziliarmuskel der Linse vollständig zu entspannen.
            </p>
          </div>
        </div>

        {/* 5-Minuten Mikrobewegung Timer */}
        <div className="rounded-lg border border-border bg-secondary/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-display font-medium text-sm text-foreground">
              <Timer className="h-4 w-4 text-blue-600" />
              <span>5-Minuten Mikrobewegung Intervall (Blueprint)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Nach 50 Minuten Deep Work: Hüftbeuger aufdehnen, Wadenwippe, Brustwirbel-Mobilisation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-2xl font-bold text-foreground">
              {formatTimer(timerSeconds)}
            </span>
            <Button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              size="sm"
              className={isTimerRunning ? "bg-amber-600 text-white" : "bg-blue-600 text-white"}
            >
              {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(300);
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* -------------------- 3. ROUTINEN: DETOX SHOT, MÖHRENSALAT & ABENDRITUAL -------------------- */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-panel space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Utensils className="h-5 w-5 text-amber-600" />
          <span>Tägliche Schlüssel-Routinen (Naturheilkunde & Darm)</span>
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* Morgen-Detox */}
          <div
            onClick={() => toggleRoutine("morning_shot")}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              state.checkedRoutines["morning_shot"]
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-border bg-card hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs text-foreground">Morgen-Detox-Wasser</span>
              <div
                className={`h-4 w-4 rounded flex items-center justify-center border ${
                  state.checkedRoutines["morning_shot"]
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-border bg-card"
                }`}
              >
                {state.checkedRoutines["morning_shot"] && <Check className="h-3 w-3" />}
              </div>
            </div>
            <div className="mt-1 text-[11px] font-mono text-accent font-semibold">
              500 ml lauwarm + Keltenmeersalz
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
              Aktiviert die Nierenfiltration, füllt nächtliche Elektrolytlücken auf und kurbelt die Peristaltik sanft an.
            </p>
          </div>

          {/* Rohkost-Möhrensalat */}
          <div
            onClick={() => toggleRoutine("raw_carrot")}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              state.checkedRoutines["raw_carrot"]
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-border bg-card hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs text-foreground">Roher Karottensalat (Ray Peat)</span>
              <div
                className={`h-4 w-4 rounded flex items-center justify-center border ${
                  state.checkedRoutines["raw_carrot"]
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-border bg-card"
                }`}
              >
                {state.checkedRoutines["raw_carrot"] && <Check className="h-3 w-3" />}
              </div>
            </div>
            <div className="mt-1 text-[11px] font-mono text-accent font-semibold">
              Geriebene Karotte + Kokosöl + ACV
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
              Unverdauliche Pflanzenfasern binden überschüssiges Östrogen und bakterielle Endotoxine im Dünndarm und transportieren sie ab.
            </p>
          </div>

          {/* Abend-Drink */}
          <div
            onClick={() => toggleRoutine("evening_drink")}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              state.checkedRoutines["evening_drink"]
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-border bg-card hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs text-foreground">Regenerations-Abenddrink</span>
              <div
                className={`h-4 w-4 rounded flex items-center justify-center border ${
                  state.checkedRoutines["evening_drink"]
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-border bg-card"
                }`}
              >
                {state.checkedRoutines["evening_drink"] && <Check className="h-3 w-3" />}
              </div>
            </div>
            <div className="mt-1 text-[11px] font-mono text-accent font-semibold">
              Kamille + Kollagen/Glycin + Bisglycinat
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
              Glycin senkt die Kernkörpertemperatur für Tiefschlaf und hemmt das nächtliche Aufwachen für die Blasenentleerung.
            </p>
          </div>
        </div>
      </div>

      {/* -------------------- 4. BRYAN JOHNSON: 1-STUNDE TRAINING BUDGET -------------------- */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-panel space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-indigo-600" />
          <span>Bryan Johnson: 1-Stunde Trainings-Budget</span>
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <div
            onClick={() => toggleRoutine("workout_strength")}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              state.checkedRoutines["workout_strength"]
                ? "border-indigo-500/40 bg-indigo-500/5"
                : "border-border bg-card hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs text-foreground">Kraft, Core & Rumpfstabilität</span>
              <div
                className={`h-4 w-4 rounded flex items-center justify-center border ${
                  state.checkedRoutines["workout_strength"]
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-border bg-card"
                }`}
              >
                {state.checkedRoutines["workout_strength"] && <Check className="h-3 w-3" />}
              </div>
            </div>
            <div className="mt-1 text-[11px] font-mono text-indigo-600 font-semibold">25 Minuten</div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
              Kniebeugen, Klimmzüge, Planks. Schützt Bandscheiben und erhält Muskelmasse.
            </p>
          </div>

          <div
            onClick={() => toggleRoutine("workout_vo2")}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              state.checkedRoutines["workout_vo2"]
                ? "border-indigo-500/40 bg-indigo-500/5"
                : "border-border bg-card hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs text-foreground">VO2 Max Sprint-Intervalle</span>
              <div
                className={`h-4 w-4 rounded flex items-center justify-center border ${
                  state.checkedRoutines["workout_vo2"]
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-border bg-card"
                }`}
              >
                {state.checkedRoutines["workout_vo2"] && <Check className="h-3 w-3" />}
              </div>
            </div>
            <div className="mt-1 text-[11px] font-mono text-indigo-600 font-semibold">15 Minuten</div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
              HIIT-Intervalle (z. B. 4x 4 Min oder Tabata). Der stärkste Einzelprädiktor für Langlebigkeit.
            </p>
          </div>

          <div
            onClick={() => toggleRoutine("workout_mobility")}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${
              state.checkedRoutines["workout_mobility"]
                ? "border-indigo-500/40 bg-indigo-500/5"
                : "border-border bg-card hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs text-foreground">Mobilität, Dehnen & Faszien</span>
              <div
                className={`h-4 w-4 rounded flex items-center justify-center border ${
                  state.checkedRoutines["workout_mobility"]
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-border bg-card"
                }`}
              >
                {state.checkedRoutines["workout_mobility"] && <Check className="h-3 w-3" />}
              </div>
            </div>
            <div className="mt-1 text-[11px] font-mono text-indigo-600 font-semibold">20 Minuten</div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
              Hüftgelenke öffnen, Schultergürtel mobilisieren, Faszien ausrollen.
            </p>
          </div>
        </div>
      </div>

      {/* -------------------- 5. FOKUS, GEHIRN & ZELLSCHUTZ SUPPLEMENTS -------------------- */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          <span>Fokus, Gehirn & Zellschutz (Kowallik)</span>
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

      {/* -------------------- 6. DARM, SCHLAF & BINDEGEWEBE -------------------- */}
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

      {/* -------------------- 7. TOXIZITÄTS-VERMEIDUNGS-RADAR -------------------- */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 shadow-panel space-y-4">
        <div className="flex items-center gap-2 text-destructive font-display font-semibold text-sm">
          <ShieldAlert className="h-5 w-5" />
          <span>Toxizitäts-Vermeidungs-Radar (Strikte rote Flaggen!)</span>
        </div>

        <div className="grid gap-2 text-xs text-foreground/80 sm:grid-cols-2">
          <div className="rounded border border-destructive/20 bg-card/60 p-3">
            <span className="font-bold text-destructive">1. Synthetische Folsäure:</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Ca. 50 % der Bevölkerung hat den MTHFR-Gendefekt und kann synthetische Folsäure nicht verarbeiten. Unverarbeitet kann sie Krebsrisiken erhöhen. Immer bioaktives <strong>Methylfolat</strong> wählen.
            </p>
          </div>

          <div className="rounded border border-destructive/20 bg-card/60 p-3">
            <span className="font-bold text-destructive">2. Synthetisches B12 (Cyanocobalamin):</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Enthält eine giftige Cyanid-Gruppe und entzieht dem Körper das Master-Antioxidans Glutathion. Nur <strong>Methylcobalamin</strong> oder <strong>Adenosylcobalamin</strong> nutzen.
            </p>
          </div>

          <div className="rounded border border-destructive/20 bg-card/60 p-3">
            <span className="font-bold text-destructive">3. Synthetisches Eisen (Eisensulfat):</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Wirkt im Darm stark oxidativ („Fahrradrost“) und befeuert chronische Darmentzündungen. Eisenbedarf nur aus natürlicher Rinderleber decken.
            </p>
          </div>

          <div className="rounded border border-destructive/20 bg-card/60 p-3">
            <span className="font-bold text-destructive">4. Calciumcarbonat:</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Zerkleinerter Kalkstein, der Nierensteine und Gefäßplaque fördert. Kalziumbedarf über echte Nahrung (z. B. Rohmilchkäse) mit Vitamin K2 decken.
            </p>
          </div>

          <div className="rounded border border-destructive/20 bg-card/60 p-3">
            <span className="font-bold text-destructive">5. Industrie-Saatöle (Omega-6 Überhang):</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Sonnenblumen-, Raps- und Sojaöl oxidieren leicht und erzeugen toxische Lipidperoxide. Verwende ausschließlich Olivenöl nativ extra, Kokosöl oder Weidebutter.
            </p>
          </div>

          <div className="rounded border border-destructive/20 bg-card/60 p-3">
            <span className="font-bold text-destructive">6. Teflon / PTFE & Mikroplastik:</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Verkratzte Antihaftpfannen geben PFAS („Ewigkeitschemikalien“) ab. Ersetze sie durch Gusseisen oder Edelstahl; trinke Wasser aus Glasflaschen statt PET.
            </p>
          </div>
        </div>
      </div>

      {/* -------------------- 8. TÄGLICHE VITALITÄT & NOTIZEN -------------------- */}
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
