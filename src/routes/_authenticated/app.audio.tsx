import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  CloudRain,
  Flame,
  Headphones,
  Music,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  TreePine,
  Volume2,
  Waves,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  focusAudio,
  FREQUENCY_CONFIG,
  type AudioSettings,
  type BrainwaveFrequency,
  type SoundscapeType,
} from "@/lib/focus-audio";

export const Route = createFileRoute("/_authenticated/app/audio")({
  head: () => ({
    meta: [
      { title: "Focus Audio & Flow State — Spark" },
      { name: "description", content: "Brain.fm-inspirierte binaurale Beats und Soundscapes für Deep Work." },
    ],
  }),
  component: AudioStudioPage,
});

function AudioStudioPage() {
  const [settings, setSettings] = useState<AudioSettings>(focusAudio.getSettings());
  const [timerSeconds, setTimerSeconds] = useState<number>(25 * 60);
  const [timerInitial, setTimerInitial] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [focusMinutesTotal, setFocusMinutesTotal] = useState<number>(() => {
    try {
      return Number(localStorage.getItem("spark_focus_minutes_today") || "45");
    } catch {
      return 45;
    }
  });

  useEffect(() => {
    const unsub = focusAudio.subscribe((s) => setSettings(s));
    return unsub;
  }, []);

  // Timer countdown
  useEffect(() => {
    let interval: number | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = window.setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            focusAudio.playChime();
            setFocusMinutesTotal((m) => {
              const next = m + Math.round(timerInitial / 60);
              try {
                localStorage.setItem("spark_focus_minutes_today", String(next));
              } catch {}
              return next;
            });
            toast.success("Hervorragende Session! Zeit für eine bewusste 5-Minuten-Pause.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds, timerInitial]);

  const setTimerPreset = (minutes: number) => {
    const secs = minutes * 60;
    setTimerSeconds(secs);
    setTimerInitial(secs);
    setIsTimerRunning(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = Math.round(((timerInitial - timerSeconds) / timerInitial) * 100);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Headphones className="h-6 w-6 text-accent" />
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Focus &amp; Flow Studio
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Binaurale 40 Hz Gamma- &amp; 10 Hz Alpha-Oszillationen, untermalt von Brown Noise und Naturklängen.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-2 text-right shadow-panel">
            <div className="text-[11px] text-muted-foreground uppercase font-semibold">Fokus heute</div>
            <div className="font-mono text-xl font-bold text-accent">{focusMinutesTotal} Min</div>
          </div>
        </div>
      </div>

      {/* Main Focus Center */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timer & Playback Dial */}
        <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-6 shadow-panel flex flex-col items-center justify-between space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Deep Work Timer
            </span>
            <div className="text-5xl font-mono font-bold text-foreground tracking-tight py-4">
              {formatTime(timerSeconds)}
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { m: 25, label: "25m Pomodoro" },
              { m: 50, label: "50m Flow" },
              { m: 90, label: "90m Sprint" },
            ].map((p) => (
              <button
                key={p.m}
                onClick={() => setTimerPreset(p.m)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border",
                  timerInitial === p.m * 60
                    ? "border-accent bg-accent/15 text-accent-foreground font-semibold"
                    : "border-border/60 hover:bg-secondary text-muted-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Big Play/Pause Trigger */}
          <div className="flex items-center gap-3 w-full">
            <Button
              size="lg"
              className={cn(
                "flex-1 gap-2 font-display text-base font-semibold shadow-sm transition-all",
                settings.isPlaying
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
              onClick={() => {
                if (!isTimerRunning && !settings.isPlaying) {
                  setIsTimerRunning(true);
                  void focusAudio.start();
                } else if (settings.isPlaying) {
                  focusAudio.stop();
                  setIsTimerRunning(false);
                } else {
                  void focusAudio.start();
                  setIsTimerRunning(true);
                }
              }}
            >
              {settings.isPlaying ? (
                <>
                  <Pause className="h-5 w-5" /> Audio pausieren
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" /> Flow starten
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(timerInitial);
              }}
              title="Timer zurücksetzen"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => focusAudio.playChime()}
              title="Gong testen"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Frequencies & Soundscapes Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Frequencies */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-panel space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-base text-foreground">
                  Binaurale Gehirnwellen-Oszillation
                </h3>
                <p className="text-xs text-muted-foreground">
                  Unterschiedliche Tonhöhen pro Ohr erzeugen eine Frequenzfolge im Gehirn (Kopfhörer empfohlen).
                </p>
              </div>
              <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                {settings.frequency.toUpperCase()}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(FREQUENCY_CONFIG) as Array<keyof typeof FREQUENCY_CONFIG>).map((freq) => {
                const conf = FREQUENCY_CONFIG[freq];
                const isActive = settings.frequency === freq;
                return (
                  <div
                    key={freq}
                    onClick={() => focusAudio.setFrequency(freq)}
                    className={cn(
                      "cursor-pointer rounded-xl border p-4 transition-all",
                      isActive
                        ? "border-accent bg-accent/10 shadow-sm"
                        : "border-border/60 hover:bg-secondary/40"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display font-semibold text-sm text-foreground">
                        {conf.label}
                      </span>
                      {isActive && <Zap className="h-4 w-4 text-accent" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{conf.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <span className="text-xs text-muted-foreground">Binaural-Lautstärke</span>
              <div className="w-48">
                <Slider
                  value={[settings.binauralVolume * 100]}
                  max={100}
                  step={1}
                  onValueChange={([val]) => focusAudio.setBinauralVolume((val ?? 50) / 100)}
                />
              </div>
            </div>
          </div>

          {/* Soundscapes */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-panel space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-base text-foreground">
                  Akustische Schutzschicht (Soundscapes)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Maskiert Hintergrundgeräusche und stabilisiert den Fokus über lange Arbeitssessions.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  id: "brown_noise",
                  label: "Brown Noise (Tiefes Rauschen)",
                  desc: "Sanfte tieffrequente Wellen, ideal gegen ADHS und Reizüberflutung",
                  icon: Waves,
                },
                {
                  id: "rain",
                  label: "Regen am Fenster",
                  desc: "Natürliche Regentropfen für beruhigende Gemütlichkeit",
                  icon: CloudRain,
                },
                {
                  id: "lofi",
                  label: "Lo-Fi Ambient Chords",
                  desc: "Subtile melodische Synthesizer-Akkorde im Hintergrund",
                  icon: Music,
                },
                {
                  id: "forest",
                  label: "Wald & Sommerbrise",
                  desc: "Leichte Waldgeräusche zur Beruhigung des Parasympathikus",
                  icon: TreePine,
                },
              ].map((s) => {
                const Icon = s.icon;
                const isActive = settings.soundscape === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => focusAudio.setSoundscape(s.id as SoundscapeType)}
                    className={cn(
                      "cursor-pointer rounded-xl border p-4 transition-all flex items-start gap-3",
                      isActive
                        ? "border-accent bg-accent/10 shadow-sm"
                        : "border-border/60 hover:bg-secondary/40"
                    )}
                  >
                    <Icon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm text-foreground">{s.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <span className="text-xs text-muted-foreground">Soundscape-Lautstärke</span>
              <div className="w-48">
                <Slider
                  value={[settings.soundscapeVolume * 100]}
                  max={100}
                  step={1}
                  onValueChange={([val]) => focusAudio.setSoundscapeVolume((val ?? 50) / 100)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
