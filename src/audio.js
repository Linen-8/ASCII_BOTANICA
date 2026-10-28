/**
 * Generative Ambient Audio Synthesizer (Web Audio API)
 * Creates a soothing, generative ambient soundscape with warm breathing drones
 * and soft pentatonic wind chimes that harmonize with the flower's blooming motion.
 */

export class AmbientSoundscape {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.droneGain = null;
    this.filter = null;
    this.chimeTimer = null;

    // Pentatonic frequencies (E minor pentatonic: E3, G3, A3, B3, D4, E4, G4, B4)
    this.chimeNotes = [164.81, 196.00, 220.00, 246.94, 293.66, 329.63, 392.00, 493.88, 587.33, 659.25];
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master Volume
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Warm Lowpass Filter
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(2.0, this.ctx.currentTime);
    this.filter.connect(this.masterGain);

    // Start Drone Oscillators
    this.startDrone();
  }

  startDrone() {
    if (!this.ctx) return;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.14, this.ctx.currentTime);
    this.droneGain.connect(this.filter);

    // Deep Root + Fifth + Octave warm chord (E2 = 82.41Hz, B2 = 123.47Hz, E3 = 164.81Hz)
    const freqs = [82.41, 123.47, 164.81, 246.94];
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Micro detune for lush organic shimmer
      osc.detune.setValueAtTime((i - 1.5) * 4.5, this.ctx.currentTime);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.08 / (i + 1), this.ctx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(this.droneGain);

      osc.start();
    });
  }

  scheduleChime() {
    if (!this.isPlaying || !this.ctx) return;

    // Pick a gentle pentatonic note
    const note = this.chimeNotes[Math.floor(Math.random() * this.chimeNotes.length)];
    this.playChime(note);

    // Schedule next chime with organic randomized timing (every 1.5 to 4.5 seconds)
    const nextInterval = 1500 + Math.random() * 3000;
    this.chimeTimer = setTimeout(() => this.scheduleChime(), nextInterval);
  }

  playChime(freq) {
    if (!this.ctx || !this.isPlaying) return;

    const chimeOsc = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();

    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    // Soft chime envelope: gentle attack, long bell-like decay
    const now = this.ctx.currentTime;
    chimeGain.gain.setValueAtTime(0.0001, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.06, now + 0.08);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

    chimeOsc.connect(chimeGain);
    chimeGain.connect(this.masterGain);

    chimeOsc.start(now);
    chimeOsc.stop(now + 3.0);
  }

  updateWithBloom(bloomAmount) {
    if (!this.ctx || !this.filter || !this.isPlaying) return;
    // Modulate filter cutoff with bloom (400Hz to 1200Hz)
    const targetFreq = 380 + bloomAmount * 700;
    this.filter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.2);
  }

  toggle() {
    if (!this.ctx) {
      this.init();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.8);
      this.scheduleChime();
    } else {
      if (this.chimeTimer) clearTimeout(this.chimeTimer);
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
    }

    return this.isPlaying;
  }
}
