/**
 * JARVIS Canvas Audio Waveform & Particle Visualizer
 * Renders state-reactive soundwaves and plasma harmonics.
 */

class HUDVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.state = "IDLE";
    this.phase = 0;
    this.particles = [];
    this.numBars = 48;
    this.barHeights = new Float32Array(this.numBars);

    if (this.canvas) {
      this._initParticles();
      this._animate = this._animate.bind(this);
      requestAnimationFrame(this._animate);
    }
  }

  _initParticles() {
    this.particles = [];
    for (let i = 0; i < 35; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.2
      });
    }
  }

  setState(newState) {
    this.state = newState;
  }

  _animate() {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const cy = height / 2;

    this.ctx.clearRect(0, 0, width, height);
    this.phase += 0.05;

    // 1. Render Floating Cyber Particles
    this.ctx.save();
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      this.ctx.fillStyle = this._getParticleColor(p.alpha);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();

    // 2. Render State-Specific Waveforms
    if (this.state === "IDLE") {
      this._renderIdleWave(width, cy);
    } else if (this.state === "LISTENING") {
      this._renderListeningRipples(width, cy);
    } else if (this.state === "THINKING") {
      this._renderThinkingSpikes(width, cy);
    } else if (this.state === "SPEAKING") {
      this._renderSpeakingEqualizer(width, height);
    }

    requestAnimationFrame(this._animate);
  }

  _getParticleColor(alpha) {
    if (this.state === "LISTENING") return `rgba(255, 183, 3, ${alpha})`;
    if (this.state === "THINKING") return `rgba(189, 0, 255, ${alpha})`;
    if (this.state === "SPEAKING") return `rgba(0, 245, 155, ${alpha})`;
    return `rgba(0, 240, 255, ${alpha})`;
  }

  _renderIdleWave(width, cy) {
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = "#00f0ff";

    this.ctx.beginPath();
    for (let x = 0; x < width; x += 3) {
      const y = cy + Math.sin(x * 0.02 + this.phase) * 6 + Math.cos(x * 0.04 - this.phase * 0.5) * 3;
      if (x === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  _renderListeningRipples(width, cy) {
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "rgba(255, 183, 3, 0.75)";
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = "#ffb703";

    this.ctx.beginPath();
    for (let x = 0; x < width; x += 2) {
      const envelope = Math.sin((x / width) * Math.PI);
      const amp = envelope * 18 * (0.8 + 0.4 * Math.sin(this.phase * 3));
      const y = cy + Math.sin(x * 0.05 + this.phase * 2) * amp;
      if (x === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  _renderThinkingSpikes(width, cy) {
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = "rgba(189, 0, 255, 0.85)";
    this.ctx.shadowBlur = 14;
    this.ctx.shadowColor = "#bd00ff";

    this.ctx.beginPath();
    for (let x = 0; x < width; x += 4) {
      const noise = (Math.sin(x * 0.15 + this.phase * 5) * Math.cos(x * 0.08 - this.phase * 3));
      const y = cy + noise * 16;
      if (x === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  _renderSpeakingEqualizer(width, height) {
    const barWidth = width / this.numBars;
    const cy = height / 2;

    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = "#00f59b";

    for (let i = 0; i < this.numBars; i++) {
      // Harmonic wave modulation
      const target = Math.abs(Math.sin(i * 0.3 + this.phase * 3)) * (height * 0.45);
      this.barHeights[i] += (target - this.barHeights[i]) * 0.25;

      const bh = Math.max(3, this.barHeights[i]);
      const x = i * barWidth + barWidth * 0.15;
      const w = barWidth * 0.7;

      const grad = this.ctx.createLinearGradient(0, cy - bh, 0, cy + bh);
      grad.addColorStop(0, "#00f59b");
      grad.addColorStop(0.5, "#00f0ff");
      grad.addColorStop(1, "#0080ff");

      this.ctx.fillStyle = grad;
      this.ctx.fillRect(x, cy - bh, w, bh * 2);
    }
    this.ctx.shadowBlur = 0;
  }
}

window.hudVisualizer = null;
document.addEventListener("DOMContentLoaded", () => {
  window.hudVisualizer = new HUDVisualizer("audioVisualizer");
});
