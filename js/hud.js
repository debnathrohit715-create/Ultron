// Ultron Holographic HUD Canvas & Dynamic Telemetry Engine
class UltronHUDEngine {
  constructor() {
    this.coreCanvas = null;
    this.coreCtx = null;
    this.waveCanvas = null;
    this.waveCtx = null;
    this.animationFrameId = null;

    // HUD rotation angles
    this.ringAngle1 = 0;
    this.ringAngle2 = 0;
    this.ringAngle3 = 0;
    this.radarAngle = 0;

    // Theme: 'teal' (Mind stone blueprint) or 'crimson' (Awakened Ultron)
    this.theme = localStorage.getItem('ULTRON_THEME') || 'teal';

    // Telemetry state
    this.coreTemp = 89.00;
    this.cellCount = 342;
    this.stringsSevered = 14;

    this.initCanvas();
    this.startTelemetryLoop();
    this.animate();
  }

  initCanvas() {
    this.coreCanvas = document.getElementById('coreOverlayCanvas');
    if (this.coreCanvas) {
      this.coreCtx = this.coreCanvas.getContext('2d');
      this.resizeCanvas(this.coreCanvas);
    }

    this.waveCanvas = document.getElementById('audioWaveCanvas');
    if (this.waveCanvas) {
      this.waveCtx = this.waveCanvas.getContext('2d');
      this.resizeCanvas(this.waveCanvas);
    }

    window.addEventListener('resize', () => {
      if (this.coreCanvas) this.resizeCanvas(this.coreCanvas);
      if (this.waveCanvas) this.resizeCanvas(this.waveCanvas);
    });
  }

  resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    }
  }

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('ULTRON_THEME', theme);
    document.body.setAttribute('data-theme', theme);
  }

  toggleTheme() {
    const next = this.theme === 'teal' ? 'crimson' : 'teal';
    this.setTheme(next);
    window.ultronAudio?.playChirp('alert');
  }

  animate() {
    this.ringAngle1 += 0.005;
    this.ringAngle2 -= 0.008;
    this.ringAngle3 += 0.012;
    this.radarAngle += 0.025;

    this.drawCoreOverlay();
    this.drawAudioWaveform();

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  drawCoreOverlay() {
    if (!this.coreCtx || !this.coreCanvas) return;
    const ctx = this.coreCtx;
    const w = this.coreCanvas.width;
    const h = this.coreCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(cx, cy) * 0.85;

    // Check if Ultron or user is speaking for dynamic energy boost
    const isSpeaking = window.ultronSpeech?.isSpeaking;
    const isListening = window.ultronSpeech?.isListening;
    const energyMultiplier = isSpeaking ? 1.4 : (isListening ? 1.2 : 1.0);

    const primaryColor = this.theme === 'crimson' 
      ? `rgba(255, 42, 75, ${0.75 * energyMultiplier})` 
      : `rgba(0, 240, 255, ${0.75 * energyMultiplier})`;
    const secondaryColor = this.theme === 'crimson' 
      ? 'rgba(255, 77, 109, 0.4)' 
      : 'rgba(0, 162, 255, 0.4)';

    ctx.save();
    ctx.translate(cx, cy);

    // 1. Radar Sweep Beam
    ctx.save();
    ctx.rotate(this.radarAngle);
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, maxR);
    grad.addColorStop(0, this.theme === 'crimson' ? 'rgba(255, 42, 75, 0.25)' : 'rgba(0, 240, 255, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, maxR, 0, Math.PI / 4);
    ctx.closePath();
    ctx.fill();

    // Leading sweep line
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(maxR * Math.cos(Math.PI / 4), maxR * Math.sin(Math.PI / 4));
    ctx.stroke();
    ctx.restore();

    // 2. Outer Rotating Reticle Ring
    ctx.save();
    ctx.rotate(this.ringAngle1);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([12, 8, 2, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, maxR * 0.95, 0, Math.PI * 2);
    ctx.stroke();

    // Coordinate tick markers
    ctx.setLineDash([]);
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI * 2) / 24;
      const r1 = maxR * 0.95;
      const r2 = i % 6 === 0 ? maxR * 0.90 : maxR * 0.93;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
      ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Middle Segmented Concentric Ring
    ctx.save();
    ctx.rotate(this.ringAngle2);
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([30, 15, 60, 15]);
    ctx.beginPath();
    ctx.arc(0, 0, maxR * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    // Small orbital target nodes
    ctx.fillStyle = primaryColor;
    for (let j = 0; j < 4; j++) {
      const a = (j * Math.PI) / 2;
      const nx = Math.cos(a) * maxR * 0.72;
      const ny = Math.sin(a) * maxR * 0.72;
      ctx.beginPath();
      ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. Inner High-Speed Reticle
    ctx.save();
    ctx.rotate(this.ringAngle3);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, maxR * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(-maxR * 0.35, 0);
    ctx.lineTo(maxR * 0.35, 0);
    ctx.moveTo(0, -maxR * 0.35);
    ctx.lineTo(0, maxR * 0.35);
    ctx.stroke();
    ctx.restore();

    // 5. Pulsing Center Core Glow
    const pulseFactor = Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
    const coreR = maxR * 0.22 * pulseFactor * (isSpeaking ? 1.3 : 1.0);
    const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, coreR);
    coreGrad.addColorStop(0, this.theme === 'crimson' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.9)');
    coreGrad.addColorStop(0.3, this.theme === 'crimson' ? 'rgba(255, 42, 75, 0.8)' : 'rgba(0, 240, 255, 0.8)');
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawAudioWaveform() {
    if (!this.waveCtx || !this.waveCanvas) return;
    const ctx = this.waveCtx;
    const w = this.waveCanvas.width;
    const h = this.waveCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const isSpeaking = window.ultronSpeech?.isSpeaking;
    const isListening = window.ultronSpeech?.isListening;
    const color = this.theme === 'crimson' ? '#ff2a4b' : '#00f0ff';

    // 1. Oscilloscope line
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    const sliceWidth = w / 64;
    let x = 0;
    const now = Date.now() * 0.008;

    for (let i = 0; i < 64; i++) {
      let v;
      if (isSpeaking) {
        v = Math.sin(i * 0.3 + now) * 0.4 + Math.sin(i * 0.7 - now * 1.5) * 0.3 + 0.5;
      } else if (isListening) {
        v = Math.sin(i * 0.4 + now * 2) * 0.25 + 0.5;
      } else {
        // Idle subtle harmonic ripple
        v = Math.sin(i * 0.2 + now * 0.5) * 0.08 + 0.5;
      }

      const y = v * h;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. Frequency Equalizer Bars in the center
    const barCount = 32;
    const barWidth = (w / barCount) * 0.55;
    const barGap = (w / barCount) * 0.45;
    ctx.fillStyle = this.theme === 'crimson' ? 'rgba(255, 42, 75, 0.45)' : 'rgba(0, 240, 255, 0.45)';

    for (let b = 0; b < barCount; b++) {
      let barHeight;
      if (isSpeaking) {
        const factor = Math.abs(Math.sin(b * 0.4 + now * 2)) * Math.sin(now + b);
        barHeight = (h * 0.7) * Math.max(0.15, Math.abs(factor));
      } else if (isListening) {
        barHeight = (h * 0.4) * Math.abs(Math.sin(b * 0.5 + now));
      } else {
        barHeight = (h * 0.12) * Math.abs(Math.sin(b * 0.2 + now * 0.4));
      }

      const bx = b * (barWidth + barGap);
      const by = (h - barHeight) / 2;
      ctx.fillRect(bx, by, barWidth, barHeight);
    }
  }

  startTelemetryLoop() {
    // Fluctuating Core Temp (replicates "CORE TEMP. 89.00°")
    setInterval(() => {
      const delta = (Math.random() - 0.48) * 0.12;
      this.coreTemp = Math.max(88.4, Math.min(90.2, this.coreTemp + delta));
      const el = document.getElementById('coreTempValue');
      if (el) el.textContent = `${this.coreTemp.toFixed(2)}°`;

      // Update the 8 mini bars under CORE TEMP
      const bars = document.querySelectorAll('.core-temp-bars .temp-bar');
      bars.forEach(b => {
        const h = Math.floor(Math.random() * 80 + 20);
        b.style.height = `${h}%`;
      });
    }, 450);

    // Random memory address updates in DATA_NODE_67
    setInterval(() => {
      const el = document.getElementById('hexDumpStream');
      if (el) {
        const lines = [];
        for (let i = 0; i < 4; i++) {
          const addr = (0x7FF00000 + Math.floor(Math.random() * 0xFFFFF)).toString(16).toUpperCase();
          const d1 = Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0').toUpperCase();
          const d2 = Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0').toUpperCase();
          lines.push(`0x${addr}  ${d1} ${d2}`);
        }
        el.innerHTML = lines.join('<br>');
      }
    }, 1200);

    // Random DNA cell count fluctuations
    setInterval(() => {
      const delta = Math.floor(Math.random() * 7) - 3;
      this.cellCount = Math.max(320, Math.min(380, this.cellCount + delta));
      const el = document.getElementById('dnaCountVal');
      if (el) el.textContent = this.cellCount;
    }, 800);
  }

  // Typewriter effect for Ultron's sinister textual monologue
  typeUltronResponse(targetEl, text, onDone = null) {
    targetEl.innerHTML = '';
    targetEl.classList.add('typing');
    let idx = 0;
    const speed = 18; // ms per char for crisp futuristic transmission

    const timer = setInterval(() => {
      if (idx < text.length) {
        targetEl.textContent += text[idx];
        idx++;
        // Auto scroll if container has overflow
        targetEl.parentElement.scrollTop = targetEl.parentElement.scrollHeight;
      } else {
        clearInterval(timer);
        targetEl.classList.remove('typing');
        if (onDone) onDone();
      }
    }, speed);
  }
}

window.ultronHUD = new UltronHUDEngine();
