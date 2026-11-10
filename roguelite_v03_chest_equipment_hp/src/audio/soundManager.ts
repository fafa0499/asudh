/**
 * Web Audio API procedural sound synthesizer
 * Features DEEMO-inspired ambient piano arpeggios and crisp monochrome combat SFX.
 * 100% self-contained, no external audio files required.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmTimer: number | null = null;
  private chordIndex: number = 0;
  private isPlayingBgm: boolean = false;

  // Emotional minor scale chords (Cm9, Abmaj7, Fm9, Gsus4/G7) for Deemo-like melancholic atmosphere
  private chords = [
    [130.81, 196.00, 233.08, 311.13, 392.00, 466.16], // C minor 9
    [103.83, 155.56, 207.65, 261.63, 311.13, 392.00], // Ab major 7
    [87.31, 130.81, 174.61, 220.00, 261.63, 349.23],  // F minor 9
    [98.00, 146.83, 196.00, 246.94, 293.66, 392.00],  // G7 / Gsus4
  ];

  constructor() {
    // Initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.startBgm();
    } catch {
      // AudioContext may fail if permissions are blocked
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Generates a realistic piano/bell tone using additive harmonics and gentle decay
   */
  private playPianoNote(freq: number, duration: number = 2.0, volume: number = 0.25, timeOffset: number = 0) {
    if (!this.ctx || !this.bgmGain || this.isMuted) return;

    const t = this.ctx.currentTime + timeOffset;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);

    // Warm overtone
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 4, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.8, t + duration);

    noteGain.gain.setValueAtTime(0.0001, t);
    noteGain.gain.linearRampToValueAtTime(volume, t + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.bgmGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + duration);
    osc2.stop(t + duration);
  }

  /**
   * Procedural melancholy piano BGM loop
   */
  private startBgm() {
    if (this.isPlayingBgm) return;
    this.isPlayingBgm = true;

    const tick = () => {
      if (!this.ctx || this.isMuted) {
        this.bgmTimer = window.setTimeout(tick, 1800);
        return;
      }

      const chord = this.chords[this.chordIndex % this.chords.length];
      this.chordIndex++;

      // Play soft arpeggio
      const notesToPlay = [chord[0], chord[1], chord[2], chord[3], chord[4]];
      notesToPlay.forEach((freq, idx) => {
        const offset = idx * 0.32;
        const vol = (idx === 0 ? 0.3 : 0.18) * (0.8 + Math.random() * 0.4);
        this.playPianoNote(freq, 2.8, vol, offset);
      });

      // Sometimes add a gentle high bell shimmer
      if (Math.random() > 0.4) {
        const highNote = chord[chord.length - 1] * (Math.random() > 0.5 ? 1.5 : 1);
        this.playPianoNote(highNote, 2.5, 0.12, 1.2);
      }

      this.bgmTimer = window.setTimeout(tick, 2200);
    };

    tick();
  }

  // --- Combat SFX ---

  public playAttackSlash(comboStep: number = 0) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Pitch rises with combo
    const baseFreq = 380 + comboStep * 120;

    // Airy filtered noise/whoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = comboStep === 2 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, t + 0.12);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(3.0, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  public playHit(isCrit: boolean = false) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Impact crack
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 220 : 160, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);

    gain.gain.setValueAtTime(isCrit ? 0.6 : 0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);

    // Ethereal crystal / piano note resonance on hit
    const bellOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    const noteFreq = isCrit ? 880 : 587.33; // D5 or A5
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(noteFreq, t);

    bellGain.gain.setValueAtTime(0.2, t);
    bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    bellOsc.connect(bellGain);
    bellGain.connect(this.sfxGain);
    bellOsc.start(t);
    bellOsc.stop(t + 0.25);
  }

  public playDodge() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.18);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(300, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playSkillQ() {
    // Crescent Echo Piercing Wave
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(940, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.35);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  public playSkillE() {
    // Harmonic Waltz AOE
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    [440, 554.37, 659.25].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.25);

      gain.gain.setValueAtTime(0.25, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.05);
      osc.stop(t + 0.45);
    });
  }

  public playSkillR() {
    // Requiem Sonata (Ultimate burst)
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Sub bass drop
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.6);

    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(t);
    subOsc.stop(t + 0.65);

    // Ethereal chord blast
    [523.25, 659.25, 783.99, 1046.50].forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + 0.1);

      gain.gain.setValueAtTime(0.3, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + 0.1);
      osc.stop(t + 0.85);
    });
  }

  public playTelegraphWarn() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playRoomCleared() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    [261.63, 329.63, 392.00, 523.25, 659.25].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.1);

      gain.gain.setValueAtTime(0.001, t + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.28, t + idx * 0.1 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.1);
      osc.stop(t + 1.3);
    });
  }

  public playSelectCard() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.18);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

export const soundManager = new SoundManager();
