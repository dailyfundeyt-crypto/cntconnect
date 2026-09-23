import { useEffect, useState } from "react";
import {
  Bell,
  CloudRain,
  Headphones,
  Maximize2,
  Minimize2,
  Music,
  Pause,
  Play,
  RotateCcw,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  focusAudio,
  FREQUENCY_CONFIG,
  type AudioSettings,
  type BrainwaveFrequency,
  type SoundscapeType,
} from "@/lib/focus-audio";

export function FocusAudioPlayer() {
  const [settings, setSettings] = useState<AudioSettings>(focusAudio.getSettings());
  const [isExpanded, setIsExpanded] = useState(false);

  // Timer state (seconds)
  const [timerSeconds, setTimerSeconds] = useState<number>(25 * 60);
  const [timerInitial, setTimerInitial] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    const unsub = focusAudio.subscribe((s) => setSettings(s));
    return unsub;
  }, []);

  // Timer countdown effect
  useEffect(() => {
    let interval: number | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = window.setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            focusAudio.playChime();
            toast.success("Fokus-Session beendet! Zeit für eine kurze Pause.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

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

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 transition-all duration-300",
        settings.isPlaying && "animate-pulse-subtle"
      )}
    >
      {/* Expanded Control Panel */}
      {isExpanded && (
        <div className="w-80 rounded-2xl border border-border bg-card/95 p-4 shadow-float backdrop-blur-md space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-accent" />
              <span className="font-display font-semibold text-sm">Brain.fm Flow Audio</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground"
                onClick={() => setIsExpanded(false)}
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Deep Work Timer */}
          <div className="rounded-xl bg-secondary/50 p-3 text-center space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Deep-Work-Timer</span>
              <span className="font-mono text-foreground font-bold text-base">
                {formatTime(timerSeconds)}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => setTimerPreset(25)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                  timerInitial === 25 * 60
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                25m Pomodoro
              </button>
              <button
                onClick={() => setTimerPreset(50)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                  timerInitial === 50 * 60
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                50m Flow
              </button>
              <button
                onClick={() => setTimerPreset(90)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                  timerInitial === 90 * 60
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                90m Sprint
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                size="sm"
                variant={isTimerRunning ? "outline" : "default"}
                className="h-7 text-xs px-3"
                onClick={() => {
                  if (!isTimerRunning && !settings.isPlaying) {
                    void focusAudio.start();
                  }
                  setIsTimerRunning(!isTimerRunning);
                }}
              >
                {isTimerRunning ? "Pause" : "Starten"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground"
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(timerInitial);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground"
                title="Gong testen"
                onClick={() => focusAudio.playChime()}
              >
                <Bell className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Brainwave Frequencies */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Binaurale Frequenz
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {(Object.keys(FREQUENCY_CONFIG) as Array<keyof typeof FREQUENCY_CONFIG>).map((freq) => {
                const conf = FREQUENCY_CONFIG[freq];
                const isActive = settings.frequency === freq;
                return (
                  <button
                    key={freq}
                    onClick={() => focusAudio.setFrequency(freq)}
                    className={cn(
                      "flex flex-col items-start p-2 rounded-lg border text-left transition-all",
                      isActive
                        ? "border-accent bg-accent/10 text-foreground font-semibold shadow-sm"
                        : "border-border/60 hover:bg-secondary/60 text-muted-foreground"
                    )}
                  >
                    <span className="text-[11px]">{conf.label}</span>
                    <span className="text-[9px] text-muted-foreground line-clamp-1">{conf.desc}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => focusAudio.setFrequency("off")}
              className={cn(
                "w-full py-1 text-[10px] text-center rounded text-muted-foreground hover:bg-secondary transition-colors",
                settings.frequency === "off" && "font-bold text-destructive"
              )}
            >
              Frequenz deaktivieren
            </button>
          </div>

          {/* Soundscapes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Klanglandschaft
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: "brown_noise", label: "Brown Noise", icon: Waves },
                { id: "rain", label: "Regen am Fenster", icon: CloudRain },
                { id: "lofi", label: "Lo-Fi Akkorde", icon: Music },
                { id: "forest", label: "Wald & Brise", icon: TreePine },
              ].map((s) => {
                const Icon = s.icon;
                const isActive = settings.soundscape === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => focusAudio.setSoundscape(s.id as SoundscapeType)}
                    className={cn(
                      "flex items-center gap-1.5 p-2 rounded-lg border transition-all text-xs",
                      isActive
                        ? "border-accent bg-accent/10 text-foreground font-semibold shadow-sm"
                        : "border-border/60 hover:bg-secondary/60 text-muted-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Music Track Status (if active) */}
          {settings.currentTrack && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-accent font-semibold">
                  BrainFM AI Track
                </span>
                <button
                  onClick={() => focusAudio.toggleBrainFmTrack()}
                  className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                >
                  {settings.isPlayingTrack ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {settings.isPlayingTrack ? "Pause" : "Play"}
                </button>
              </div>
              <div className="text-xs font-bold text-foreground truncate">
                {settings.currentTrack.title}
              </div>
            </div>
          )}

          {/* Master Volume */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Volume2 className="h-3.5 w-3.5" /> Lautstärke
              </span>
              <span className="font-mono text-[11px]">{Math.round(settings.volume * 100)}%</span>
            </div>
            <Slider
              value={[settings.volume * 100]}
              max={100}
              step={1}
              onValueChange={([val]) => focusAudio.setVolume((val ?? 50) / 100)}
            />
          </div>
        </div>
      )}

      {/* Floating Pill Mini-Bar */}
      <div className="flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 shadow-float backdrop-blur-md">
        <button
          onClick={() => {
            if (settings.currentTrack) {
              focusAudio.toggleBrainFmTrack();
            } else {
              focusAudio.toggle();
            }
          }}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-95 shadow-sm",
            settings.isPlaying || settings.isPlayingTrack
              ? "bg-accent text-accent-foreground"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          )}
          title={settings.isPlaying || settings.isPlayingTrack ? "Audio pausieren" : "Fokus-Audio starten"}
        >
          {settings.isPlaying || settings.isPlayingTrack ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>

        {/* Live Audio Visualizer bars */}
        <div className="flex items-center gap-0.5 px-1 h-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={cn(
                "w-0.5 rounded-full bg-accent transition-all duration-200",
                settings.isPlaying || settings.isPlayingTrack
                  ? `h-${(i % 3) + 2} animate-pulse`
                  : "h-1 opacity-30"
              )}
            />
          ))}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-accent transition-colors px-1"
        >
          <span className="max-w-[130px] truncate">
            {settings.isPlayingTrack && settings.currentTrack
              ? settings.currentTrack.title
              : settings.isPlaying
              ? `${settings.frequency !== "off" ? settings.frequency.toUpperCase() : "Sound"} · ${formatTime(timerSeconds)}`
              : "Focus Audio"}
          </span>
          {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}
