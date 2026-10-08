// Web Audio procedural sound synthesizer for dark fantasy atmosphere

class DarkFantasySoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientNoise: AudioBufferSourceNode | null = null;
  private heartbeatInterval: number | null = null;
  private ambientRunning: boolean = false;

  constructor() {
    // Check saved mute preference
    const saved = localStorage.getItem('grimmire_muted');
    this.isMuted = saved === 'true';
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('grimmire_muted', String(this.isMuted));
    if (this.isMuted) {
      if (this.ambientGain && this.ctx) {
        this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      this.stopHeartbeat();
    } else {
      if (this.ambientGain && this.ctx && this.ambientRunning) {
        this.ambientGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      }
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startAmbient() {
    if (this.ambientRunning) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime);
      this.ambientGain.connect(this.ctx.destination);

      // Low ominous drone 1 (55Hz, sub A)
      this.ambientOsc1 = this.ctx.createOscillator();
      this.ambientOsc1.type = 'sawtooth';
      this.ambientOsc1.frequency.setValueAtTime(55, this.ctx.currentTime);

      const filter1 = this.ctx.createBiquadFilter();
      filter1.type = 'lowpass';
      filter1.frequency.setValueAtTime(120, this.ctx.currentTime);

      this.ambientOsc1.connect(filter1);
      filter1.connect(this.ambientGain);
      this.ambientOsc1.start();

      // Slow pulsating sinister chord 2 (82.4Hz, low E)
      this.ambientOsc2 = this.ctx.createOscillator();
      this.ambientOsc2.type = 'sine';
      this.ambientOsc2.frequency.setValueAtTime(82.4, this.ctx.currentTime);

      const filter2 = this.ctx.createBiquadFilter();
      filter2.type = 'bandpass';
      filter2.frequency.setValueAtTime(160, this.ctx.currentTime);

      this.ambientOsc2.connect(filter2);
      filter2.connect(this.ambientGain);
      this.ambientOsc2.start();

      this.ambientRunning = true;
    } catch {
      // Audio autoplay restriction handling
    }
  }

  public stopAmbient() {
    try {
      if (this.ambientOsc1) {
        this.ambientOsc1.stop();
        this.ambientOsc1.disconnect();
        this.ambientOsc1 = null;
      }
      if (this.ambientOsc2) {
        this.ambientOsc2.stop();
        this.ambientOsc2.disconnect();
        this.ambientOsc2 = null;
      }
      this.ambientRunning = false;
    } catch {
      // Ignore cleanup error
    }
  }

  // Play weapon swing or metallic clash
  public playClash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.25);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  // Play damage taken / bone-cracking impact
  public playHurt() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.41);
  }

  // Play health potion drink / soothing magic
  public playDrinkPotion() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [220, 330, 440, 660].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.12, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.31);
    });
  }

  // Play parchment page rustle / select action
  public playParchment() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.06;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start();
  }

  // Play dice roll click clack
  public playDiceRoll() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const clicks = 6;
    for (let i = 0; i < clicks; i++) {
      const delay = i * 0.07 + Math.random() * 0.02;
      const t = this.ctx.currentTime + delay;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(300 + Math.random() * 400, t);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.045);
    }
  }

  // Play eerie treasure loot discovery chime
  public playLootChime() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.1, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.62);
    });
  }

  // Critical HP heartbeat toggle
  public updateHealthState(currentHp: number) {
    if (currentHp <= 25 && currentHp > 0) {
      this.startHeartbeat();
    } else {
      this.stopHeartbeat();
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval !== null || this.isMuted) return;
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isMuted) return;
      this.initContext();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      // Lub
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.frequency.setValueAtTime(55, t);
      gain1.gain.setValueAtTime(0.2, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.13);

      // Dub
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.frequency.setValueAtTime(45, t + 0.16);
      gain2.gain.setValueAtTime(0.18, t + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t + 0.16);
      osc2.stop(t + 0.31);
    }, 1100);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const sound = new DarkFantasySoundEngine();
