/**
 * Web Audio API based Focus & Flow Audio Engine (Brain.fm style).
 * 100% offline, zero external sound files needed.
 * Generates true binaural beats, neural oscillations, and soothing soundscapes.
 */

import type { BrainFmTrack } from "./brainfm-tracks";

export type BrainwaveFrequency = "gamma" | "alpha" | "theta" | "delta" | "off";
export type SoundscapeType = "none" | "brown_noise" | "rain" | "lofi" | "forest";

export interface AudioSettings {
  frequency: BrainwaveFrequency;
  soundscape: SoundscapeType;
  volume: number; // 0 to 1
  binauralVolume: number; // 0 to 1
  soundscapeVolume: number; // 0 to 1
  trackVolume: number; // 0 to 1
  isPlaying: boolean; // binaural / soundscape playing
  isPlayingTrack: boolean; // music track playing
  currentTrack: BrainFmTrack | null;
  trackProgress: number; // seconds
  trackDuration: number; // seconds
}

const FREQUENCY_CONFIG: Record<
  Exclude<BrainwaveFrequency, "off">,
  { label: string; hz: number; desc: string; carrier: number }
> = {
  gamma: {
    label: "Gamma (40 Hz)",
    hz: 40,
    desc: "Laser-Fokus, Problemlösung & Gedächtnisleistung",
    carrier: 200,
  },
  alpha: {
    label: "Alpha (10 Hz)",
    hz: 10,
    desc: "Flow-Zustand, entspannte Konzentration & Lernen",
    carrier: 180,
  },
  theta: {
    label: "Theta (6 Hz)",
    hz: 6,
    desc: "Kreativität, Intuition & tiefes Nachdenken",
    carrier: 140,
  },
  delta: {
    label: "Delta (2 Hz)",
    hz: 2,
    desc: "Tiefe Entspannung, Regeneration & Ruhe",
    carrier: 100,
  },
};

class FocusAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private binauralGain: GainNode | null = null;
  private soundscapeGain: GainNode | null = null;

  // Binaural oscillators
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;

  // Soundscape nodes
  private noiseNode: AudioNode | null = null;
  private lofiInterval: number | null = null;

  private settings: AudioSettings = {
    frequency: "alpha",
    soundscape: "brown_noise",
    volume: 0.6,
    binauralVolume: 0.5,
    soundscapeVolume: 0.7,
    trackVolume: 0.8,
    isPlaying: false,
    isPlayingTrack: false,
    currentTrack: null,
    trackProgress: 0,
    trackDuration: 0,
  };

  private audioEl: HTMLAudioElement | null = null;
  private listeners: Set<(s: AudioSettings) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      this.initAudioElement();
    }
  }

  private initAudioElement() {
    if (this.audioEl || typeof window === "undefined") return;
    this.audioEl = new Audio();
    this.audioEl.loop = true;
    this.audioEl.volume = this.settings.trackVolume * this.settings.volume;

    this.audioEl.addEventListener("timeupdate", () => {
      if (this.audioEl) {
        this.settings.trackProgress = this.audioEl.currentTime;
        this.settings.trackDuration = this.audioEl.duration || 0;
        this.notify();
      }
    });

    this.audioEl.addEventListener("play", () => {
      this.settings.isPlayingTrack = true;
      this.notify();
    });

    this.audioEl.addEventListener("pause", () => {
      this.settings.isPlayingTrack = false;
      this.notify();
    });

    this.audioEl.addEventListener("ended", () => {
      this.settings.isPlayingTrack = false;
      this.notify();
    });
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.settings.volume;
      this.masterGain.connect(this.ctx.destination);

      this.binauralGain = this.ctx.createGain();
      this.binauralGain.gain.value = this.settings.binauralVolume;
      this.binauralGain.connect(this.masterGain);

      this.soundscapeGain = this.ctx.createGain();
      this.soundscapeGain.gain.value = this.settings.soundscapeVolume;
      this.soundscapeGain.connect(this.masterGain);
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public subscribe(listener: (s: AudioSettings) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSettings());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const s = this.getSettings();
    this.listeners.forEach((l) => l(s));
  }

  public async start() {
    this.initContext();
    if (!this.ctx) return;

    this.stopNodes();
    this.startBinaural();
    this.startSoundscape();

    this.settings.isPlaying = true;
    this.notify();
  }

  public stop() {
    this.stopNodes();
    this.settings.isPlaying = false;
    this.notify();
  }

  public toggle() {
    if (this.settings.isPlaying) {
      this.stop();
    } else {
      void this.start();
    }
  }

  // --- Real Music Track Controls ---
  public async playBrainFmTrack(track: BrainFmTrack) {
    this.initAudioElement();
    if (!this.audioEl) return;

    if (this.settings.currentTrack?.id !== track.id) {
      this.audioEl.src = track.audioUrl;
      this.settings.currentTrack = track;
    }

    this.audioEl.volume = this.settings.trackVolume * this.settings.volume;
    try {
      await this.audioEl.play();
      this.settings.isPlayingTrack = true;
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
    this.notify();
  }

  public pauseBrainFmTrack() {
    if (this.audioEl) {
      this.audioEl.pause();
      this.settings.isPlayingTrack = false;
      this.notify();
    }
  }

  public resumeBrainFmTrack() {
    if (this.audioEl && this.settings.currentTrack) {
      void this.audioEl.play();
      this.settings.isPlayingTrack = true;
      this.notify();
    }
  }

  public toggleBrainFmTrack(track?: BrainFmTrack) {
    if (track && this.settings.currentTrack?.id !== track.id) {
      void this.playBrainFmTrack(track);
      return;
    }
    if (this.settings.isPlayingTrack) {
      this.pauseBrainFmTrack();
    } else if (this.settings.currentTrack) {
      this.resumeBrainFmTrack();
    } else if (track) {
      void this.playBrainFmTrack(track);
    }
  }

  public setTrackVolume(vol: number) {
    this.settings.trackVolume = Math.max(0, Math.min(1, vol));
    if (this.audioEl) {
      this.audioEl.volume = this.settings.trackVolume * this.settings.volume;
    }
    this.notify();
  }

  public seekTrack(seconds: number) {
    if (this.audioEl && Number.isFinite(seconds)) {
      this.audioEl.currentTime = seconds;
      this.settings.trackProgress = seconds;
      this.notify();
    }
  }

  public setFrequency(freq: BrainwaveFrequency) {
    this.settings.frequency = freq;
    if (this.settings.isPlaying) {
      this.startBinaural();
    }
    this.notify();
  }

  public setSoundscape(type: SoundscapeType) {
    this.settings.soundscape = type;
    if (this.settings.isPlaying) {
      this.startSoundscape();
    }
    this.notify();
  }

  public setVolume(vol: number) {
    this.settings.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.settings.volume, this.ctx.currentTime, 0.05);
    }
    if (this.audioEl) {
      this.audioEl.volume = this.settings.trackVolume * this.settings.volume;
    }
    this.notify();
  }

  public setBinauralVolume(vol: number) {
    this.settings.binauralVolume = Math.max(0, Math.min(1, vol));
    if (this.binauralGain && this.ctx) {
      this.binauralGain.gain.setTargetAtTime(this.settings.binauralVolume, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public setSoundscapeVolume(vol: number) {
    this.settings.soundscapeVolume = Math.max(0, Math.min(1, vol));
    if (this.soundscapeGain && this.ctx) {
      this.soundscapeGain.gain.setTargetAtTime(this.settings.soundscapeVolume, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  private stopNodes() {
    if (this.leftOsc) {
      try { this.leftOsc.stop(); this.leftOsc.disconnect(); } catch {}
      this.leftOsc = null;
    }
    if (this.rightOsc) {
      try { this.rightOsc.stop(); this.rightOsc.disconnect(); } catch {}
      this.rightOsc = null;
    }
    if (this.noiseNode) {
      try { this.noiseNode.disconnect(); } catch {}
      this.noiseNode = null;
    }
    if (this.lofiInterval) {
      window.clearInterval(this.lofiInterval);
      this.lofiInterval = null;
    }
  }

  private startBinaural() {
    if (!this.ctx || !this.binauralGain) return;
    if (this.leftOsc) {
      try { this.leftOsc.stop(); this.leftOsc.disconnect(); } catch {}
      this.leftOsc = null;
    }
    if (this.rightOsc) {
      try { this.rightOsc.stop(); this.rightOsc.disconnect(); } catch {}
      this.rightOsc = null;
    }

    if (this.settings.frequency === "off") return;

    const conf = FREQUENCY_CONFIG[this.settings.frequency];
    if (!conf) return;

    const merger = this.ctx.createChannelMerger(2);

    // Left ear (carrier)
    this.leftOsc = this.ctx.createOscillator();
    this.leftOsc.type = "sine";
    this.leftOsc.frequency.value = conf.carrier;
    this.leftOsc.connect(merger, 0, 0);

    // Right ear (carrier + beat frequency)
    this.rightOsc = this.ctx.createOscillator();
    this.rightOsc.type = "sine";
    this.rightOsc.frequency.value = conf.carrier + conf.hz;
    this.rightOsc.connect(merger, 0, 1);

    merger.connect(this.binauralGain);

    this.leftOsc.start();
    this.rightOsc.start();
  }

  private startSoundscape() {
    if (!this.ctx || !this.soundscapeGain) return;

    if (this.noiseNode) {
      try { this.noiseNode.disconnect(); } catch {}
      this.noiseNode = null;
    }
    if (this.lofiInterval) {
      window.clearInterval(this.lofiInterval);
      this.lofiInterval = null;
    }

    const type = this.settings.soundscape;
    if (type === "none") return;

    if (type === "brown_noise" || type === "rain" || type === "forest") {
      this.startNoise(type);
    } else if (type === "lofi") {
      this.startLofi();
    }
  }

  private startNoise(type: "brown_noise" | "rain" | "forest") {
    if (!this.ctx || !this.soundscapeGain) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === "brown_noise") {
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i]!;
        output[i]! *= 3.5; // Compensate volume
      } else if (type === "rain") {
        output[i] = (lastOut + 0.08 * white) / 1.08;
        lastOut = output[i]!;
        // Random raindrops crackle
        if (Math.random() < 0.002) output[i]! += (Math.random() * 2 - 1) * 0.4;
      } else {
        // Forest breeze
        output[i] = (lastOut + 0.03 * white) / 1.03;
        lastOut = output[i]!;
      }
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter
    const filter = this.ctx.createBiquadFilter();
    if (type === "brown_noise") {
      filter.type = "lowpass";
      filter.frequency.value = 400;
    } else if (type === "rain") {
      filter.type = "bandpass";
      filter.frequency.value = 1200;
      filter.Q.value = 0.8;
    } else {
      filter.type = "lowpass";
      filter.frequency.value = 650;
    }

    whiteNoise.connect(filter);
    filter.connect(this.soundscapeGain);
    whiteNoise.start();

    this.noiseNode = whiteNoise;
  }

  private startLofi() {
    if (!this.ctx || !this.soundscapeGain) return;

    // Ambient warm chords generator
    const chords = [
      [220, 261.63, 329.63, 392.0], // Am7
      [174.61, 220, 261.63, 329.63], // Fmaj7
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [196.0, 246.94, 293.66, 349.23], // G7
    ];
    let chordIdx = 0;

    const playChord = () => {
      if (!this.ctx || !this.soundscapeGain || !this.settings.isPlaying) return;
      const chord = chords[chordIdx % chords.length]!;
      chordIdx++;

      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = "triangle";
        osc.frequency.value = freq;

        filter.type = "lowpass";
        filter.frequency.value = 800;

        const now = this.ctx!.currentTime;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 4.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.soundscapeGain!);

        osc.start(now);
        osc.stop(now + 5);
      });
    };

    playChord();
    this.lofiInterval = window.setInterval(playChord, 5000);
  }

  public playChime() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;

      const time = this.ctx!.currentTime + idx * 0.15;
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(time);
      osc.stop(time + 1.3);
    });
  }
}

export const focusAudio = new FocusAudioEngine();
export { FREQUENCY_CONFIG };
