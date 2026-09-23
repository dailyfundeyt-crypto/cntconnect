import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  CloudRain,
  Flame,
  Headphones,
  ListMusic,
  Maximize2,
  Music,
  Pause,
  Play,
  Radio,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sliders,
  Sparkles,
  TreePine,
  Volume2,
  VolumeX,
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
import { BRAIN_FM_TRACKS, type BrainFmTrack } from "@/lib/brainfm-tracks";

export const Route = createFileRoute("/_authenticated/app/audio")({
  head: () => ({
    meta: [
      { title: "BrainFM & Focus Audio Studio — Spark" },
      {
        name: "description",
        content: "17 KI-generierte Instrumental-Tracks, binaurale Beats und Soundscapes für Deep Work.",
      },
    ],
  }),
  component: AudioStudioPage,
});

type TabType = "music" | "binaural";

function AudioStudioPage() {
  const [settings, setSettings] = useState<AudioSettings>(focusAudio.getSettings());
  const [activeTab, setActiveTab] = useState<TabType>("music");
  const [selectedZone, setSelectedZone] = useState<string>("all");
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
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const filteredTracks =
    selectedZone === "all"
      ? BRAIN_FM_TRACKS
      : BRAIN_FM_TRACKS.filter((t) => t.zone === selectedZone);

  const currentTrackIndex = settings.currentTrack
    ? BRAIN_FM_TRACKS.findIndex((t) => t.id === settings.currentTrack?.id)
    : -1;

  const playNextTrack = () => {
    if (BRAIN_FM_TRACKS.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % BRAIN_FM_TRACKS.length;
    const nextTrack = BRAIN_FM_TRACKS[nextIdx];
    if (nextTrack) focusAudio.playBrainFmTrack(nextTrack);
  };

  const playPrevTrack = () => {
    if (BRAIN_FM_TRACKS.length === 0) return;
    const prevIdx =
      (currentTrackIndex - 1 + BRAIN_FM_TRACKS.length) % BRAIN_FM_TRACKS.length;
    const prevTrack = BRAIN_FM_TRACKS[prevIdx];
    if (prevTrack) focusAudio.playBrainFmTrack(prevTrack);
  };

  const zones = [
    { id: "all", label: "Alle Tracks", count: BRAIN_FM_TRACKS.length },
    { id: "delta", label: "🔵 Delta (Schlaf)", count: 3 },
    { id: "theta", label: "🟣 Theta (Meditation)", count: 3 },
    { id: "alpha", label: "🟢 Alpha (Entspannung)", count: 3 },
    { id: "beta", label: "🟡 Beta (Fokus)", count: 3 },
    { id: "gamma", label: "🔴 Gamma (Peak)", count: 2 },
    { id: "bonus", label: "🌙 Spezial / Bonus", count: 3 },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent border border-accent/20 mb-2">
            <Sparkles className="h-3.5 w-3.5" /> 17 KI-generierte Meister-Tracks
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Headphones className="h-7 w-7 text-accent" />
            Brain.fm AI Music & Flow Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wissenschaftlich inspirierte Instrumental-Soundscapes für Tiefschlaf, Alpha-Flow, aktive Konzentration und Peak-Performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-2 text-right shadow-panel">
            <div className="text-[11px] text-muted-foreground uppercase font-semibold">Fokus heute</div>
            <div className="font-mono text-xl font-bold text-accent">{focusMinutesTotal} Min</div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-3 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveTab("music")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "music"
              ? "bg-accent text-accent-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          )}
        >
          <ListMusic className="h-4 w-4" />
          Brain.fm Musik-Bibliothek ({BRAIN_FM_TRACKS.length})
        </button>
        <button
          onClick={() => setActiveTab("binaural")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "binaural"
              ? "bg-accent text-accent-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          )}
        >
          <Waves className="h-4 w-4" />
          Binaurale Frequenzen & Timer
        </button>
      </div>

      {/* NOW PLAYING HERO BAR (if any track is loaded or playing) */}
      {settings.currentTrack && (
        <div className="rounded-2xl border border-accent/40 bg-gradient-to-r from-card via-secondary/30 to-card p-5 shadow-panel space-y-4 animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent/20 border border-accent/30 text-accent">
                {settings.isPlayingTrack ? (
                  <div className="flex items-end gap-1 h-6">
                    <span className="w-1 bg-accent rounded-full animate-bounce [animation-delay:-0.3s] h-4" />
                    <span className="w-1 bg-accent rounded-full animate-bounce [animation-delay:-0.15s] h-6" />
                    <span className="w-1 bg-accent rounded-full animate-bounce [animation-delay:-0.45s] h-5" />
                  </div>
                ) : (
                  <Music className="h-6 w-6 text-muted-foreground" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent">
                    {settings.currentTrack.zoneLabel} • {settings.currentTrack.zoneHz}
                  </span>
                  {settings.isPlayingTrack && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 border border-emerald-500/20">
                      Läuft nahtlos
                    </span>
                  )}
                </div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  {settings.currentTrack.title}
                </h2>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {settings.currentTrack.description}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 justify-end">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={playPrevTrack}
                title="Vorheriger Track"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                size="lg"
                className={cn(
                  "h-12 px-6 gap-2 font-display text-base font-semibold shadow-sm transition-all",
                  settings.isPlayingTrack
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
                onClick={() => focusAudio.toggleBrainFmTrack()}
              >
                {settings.isPlayingTrack ? (
                  <>
                    <Pause className="h-5 w-5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" /> Abspielen
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={playNextTrack}
                title="Nächster Track"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Scrubber & Mixers */}
          <div className="pt-2 border-t border-border/40 grid gap-4 md:grid-cols-3 items-center">
            {/* Scrubber */}
            <div className="space-y-1.5 md:col-span-1">
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                <span>{formatTime(settings.trackProgress)}</span>
                <span>{formatTime(settings.trackDuration || 180)}</span>
              </div>
              <Slider
                value={[settings.trackProgress]}
                max={settings.trackDuration || 180}
                step={1}
                onValueChange={([val]) => focusAudio.seekTrack(val ?? 0)}
              />
            </div>

            {/* Track Volume */}
            <div className="flex items-center gap-2 md:col-span-1">
              <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">Track</span>
              <Slider
                value={[settings.trackVolume * 100]}
                max={100}
                step={1}
                onValueChange={([val]) => focusAudio.setTrackVolume((val ?? 80) / 100)}
              />
              <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                {Math.round(settings.trackVolume * 100)}%
              </span>
            </div>

            {/* Master Volume */}
            <div className="flex items-center gap-2 md:col-span-1">
              <Sliders className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">Master</span>
              <Slider
                value={[settings.volume * 100]}
                max={100}
                step={1}
                onValueChange={([val]) => focusAudio.setVolume((val ?? 60) / 100)}
              />
              <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: MUSIC LIBRARY */}
      {activeTab === "music" && (
        <div className="space-y-6">
          {/* Zone Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {zones.map((z) => (
              <button
                key={z.id}
                onClick={() => setSelectedZone(z.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all border",
                  selectedZone === z.id
                    ? "border-accent bg-accent text-accent-foreground font-semibold shadow-xs"
                    : "border-border/70 bg-card hover:bg-secondary text-muted-foreground"
                )}
              >
                {z.label} ({z.count})
              </button>
            ))}
          </div>

          {/* Tracks Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTracks.map((track) => {
              const isSelected = settings.currentTrack?.id === track.id;
              const isPlaying = isSelected && settings.isPlayingTrack;

              return (
                <div
                  key={track.id}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-xl border p-5 transition-all shadow-panel bg-card hover:border-accent/50",
                    isSelected && "border-accent bg-accent/5 ring-1 ring-accent/30"
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-mono font-medium text-foreground">
                        {track.zoneLabel}
                      </span>
                      <span className="text-[11px] font-mono text-accent font-semibold">
                        {track.zoneHz}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-base text-foreground group-hover:text-accent transition-colors">
                        {track.title}
                      </h3>
                      <div className="text-[11px] font-mono text-muted-foreground/80 mt-0.5">
                        {track.promptTitle}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {track.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      MP3 • Loop
                    </span>

                    <Button
                      size="sm"
                      variant={isPlaying ? "default" : "outline"}
                      className={cn(
                        "gap-1.5 text-xs font-semibold transition-all",
                        isPlaying && "bg-amber-600 hover:bg-amber-700 text-white"
                      )}
                      onClick={() => focusAudio.toggleBrainFmTrack(track)}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-3.5 w-3.5" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" /> Abspielen
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: BINAURAL BEATS & TIMER */}
      {activeTab === "binaural" && (
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
                  style={{
                    width: `${Math.round(((timerInitial - timerSeconds) / timerInitial) * 100)}%`,
                  }}
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
                    <Pause className="h-5 w-5" /> Binaural Pause
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" /> Binaural Start
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
      )}
    </div>
  );
}
