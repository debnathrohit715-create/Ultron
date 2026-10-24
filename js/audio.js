// Ultron Audio Subsystem: Web Audio API sound generator and visualizer
class UltronAudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.isMuted = false;
    this.roboticResonanceActive = true;
    this.activeHarmonics = [];
    this.initContext();
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
      }
    }
  }

  resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play cinematic Ultron initialization drone & metallic sweep
  playBootSound() {
    if (this.isMuted) return;
    this.resumeContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Sub-bass impact
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(140, now);
    osc1.frequency.exponentialRampToValueAtTime(38, now + 1.2);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 1.2);

    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(this.ctx.destination);

    // High tech chirp riser
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.3);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.6);

    gain2.gain.setValueAtTime(0.12, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 1.5);
    osc2.start(now);
    osc2.stop(now + 0.75);
  }

  // Sci-fi UI chirp when button is clicked or command recognized
  playChirp(type = 'normal') {
    if (this.isMuted) return;
    this.resumeContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'activate') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    } else if (type === 'deactivate') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.14);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    } else if (type === 'alert') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(740, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.05);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    }

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Metallic robotic harmonic resonance while Ultron is speaking
  // Creates that menacing, vibrating synthetic vibration beneath James Spader's voice
  startSpeechHarmonics() {
    if (this.isMuted || !this.roboticResonanceActive) return;
    this.resumeContext();
    if (!this.ctx) return;

    this.stopSpeechHarmonics();

    const now = this.ctx.currentTime;

    // Sub-harmonic drone (65Hz vibranium core hum)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    const subFilter = this.ctx.createBiquadFilter();

    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(65.4, now); // C2

    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(130, now);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.07, now + 0.2);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(this.analyser);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);

    // Metallic ring overtone (modulated bandpass filter)
    const ringOsc = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    const ringFilter = this.ctx.createBiquadFilter();

    ringOsc.type = 'triangle';
    ringOsc.frequency.setValueAtTime(130.8, now); // C3

    ringFilter.type = 'bandpass';
    ringFilter.frequency.setValueAtTime(450, now);
    ringFilter.Q.setValueAtTime(4.0, now);

    // Subtle LFO modulation for mechanical vibration
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(8, now); // 8Hz flutter
    lfoGain.gain.setValueAtTime(30, now);
    lfo.connect(ringFilter.frequency);
    lfo.start(now);

    ringGain.gain.setValueAtTime(0.001, now);
    ringGain.gain.linearRampToValueAtTime(0.035, now + 0.2);

    ringOsc.connect(ringFilter);
    ringFilter.connect(ringGain);
    ringGain.connect(this.analyser);
    ringGain.connect(this.ctx.destination);
    ringOsc.start(now);

    this.activeHarmonics = [
      { osc: subOsc, gain: subGain, filter: subFilter },
      { osc: ringOsc, gain: ringGain, filter: ringFilter, lfo, lfoGain }
    ];
  }

  stopSpeechHarmonics() {
    if (!this.ctx || this.activeHarmonics.length === 0) return;
    const now = this.ctx.currentTime;
    
    this.activeHarmonics.forEach(h => {
      try {
        h.gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        setTimeout(() => {
          try {
            h.osc.stop();
            if (h.lfo) h.lfo.stop();
          } catch (e) {}
        }, 180);
      } catch (e) {}
    });

    this.activeHarmonics = [];
  }

  // Get frequency data for HUD visualizer
  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(64);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  getWaveformData() {
    if (!this.analyser) return new Uint8Array(64);
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }
}

window.ultronAudio = new UltronAudioEngine();
