/**
 * JARVIS Desktop HUD Frontend Controller
 * Connects with Python WebSocket backend, manages state machine & HUD interactions.
 */

class JarvisHUDApp {
  constructor() {
    this.ws = null;
    this.wsUrl = "ws://127.0.0.1:8765";
    this.currentState = "IDLE";
    this.eventCount = 0;
    this.isReconnecting = false;
    this.speechRecognition = null;
    this.voiceEnabled = true;
    this.cachedVoices = [];
    this._lastSpokenText = "";
    this._lastSpokenTime = 0;

    this._bindElements();
    this._initEvents();
    this._initClock();
    this._initWebSpeechFallback();
    this._connectWebSocket();
    this._loadSupabaseLogs();
  }

  _bindElements() {
    this.wsStatus = document.getElementById("wsStatus");
    this.sysClock = document.getElementById("sysClock");

    // Telemetry Elements
    this.cpuVal = document.getElementById("cpuVal");
    this.cpuBar = document.getElementById("cpuBar");
    this.ramVal = document.getElementById("ramVal");
    this.ramBar = document.getElementById("ramBar");
    this.diskVal = document.getElementById("diskVal");
    this.diskBar = document.getElementById("diskBar");

    // Center Stage
    this.statePill = document.getElementById("statePill");
    this.stateLabel = document.getElementById("stateLabel");
    this.reactorAura = document.getElementById("reactorAura");
    this.aiCaption = document.getElementById("aiCaption");

    // Terminal
    this.terminalStream = document.getElementById("terminalStream");
    this.logCounter = document.getElementById("logCounter");
    this.btnClearTerminal = document.getElementById("btnClearTerminal");
    this.btnCopyTerminal = document.getElementById("btnCopyTerminal");

    // Input Dock
    this.btnVoiceMic = document.getElementById("btnVoiceMic");
    this.cmdInput = document.getElementById("cmdInput");
    this.btnTransmit = document.getElementById("btnTransmit");
    this.btnClearInput = document.getElementById("btnClearInput");
    this.btnSfxToggle = document.getElementById("btnSfxToggle");
    this.btnVoiceToggle = document.getElementById("btnVoiceToggle");
    this.btnTestVoice = document.getElementById("btnTestVoice");

    // Window Controls
    this.btnMinimize = document.getElementById("btnMinimize");
    this.btnMaximize = document.getElementById("btnMaximize");
    this.btnClose = document.getElementById("btnClose");
  }

  _initEvents() {
    // Window control buttons
    if (window.electronAPI) {
      this.btnMinimize?.addEventListener("click", () => window.electronAPI.minimize());
      this.btnMaximize?.addEventListener("click", () => window.electronAPI.maximize());
      this.btnClose?.addEventListener("click", () => window.electronAPI.close());
    }

    // Transmit button & Enter key
    this.btnTransmit?.addEventListener("click", () => this._handleTransmit());
    this.cmdInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this._handleTransmit();
      } else if (e.key === "Escape") {
        this.cmdInput.value = "";
      }
    });

    this.btnClearInput?.addEventListener("click", () => {
      this.cmdInput.value = "";
      this.cmdInput.focus();
    });

    // Voice Mic Trigger
    this.btnVoiceMic?.addEventListener("click", () => this._triggerVoiceMic());

    // Spoken Voice Responses Toggle
    this.btnVoiceToggle?.addEventListener("click", () => {
      this.voiceEnabled = !this.voiceEnabled;
      this.btnVoiceToggle.classList.toggle("active", this.voiceEnabled);
      this.btnVoiceToggle.innerText = this.voiceEnabled ? "🗣️ VOICE ON" : "🔇 VOICE OFF";
      window.soundFX?.playBeep();
      if (!this.voiceEnabled && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      this._log("VOICE", `Spoken voice output ${this.voiceEnabled ? "ENABLED" : "MUTED"}.`, "INFO");
    });

    // Voice Test Button
    this.btnTestVoice?.addEventListener("click", () => {
      window.soundFX?.playBeep();
      this._speakInBrowser("Vocal speech synthesis online, Sir. All Stark Industries audio channels functioning at peak nominal efficiency.");
      this._log("VOICE", "Vocal audio test initiated.", "SUCCESS");
    });

    // SFX Toggle
    this.btnSfxToggle?.addEventListener("click", () => {
      const active = window.soundFX.toggle();
      this.btnSfxToggle.classList.toggle("active", active);
      this.btnSfxToggle.innerText = active ? "🔊 SFX ON" : "🔇 SFX OFF";
    });

    // Terminal Controls
    this.btnClearTerminal?.addEventListener("click", () => {
      this.terminalStream.innerHTML = "";
      this.eventCount = 0;
      this._updateLogCount();
      window.soundFX?.playBeep();
    });

    this.btnCopyTerminal?.addEventListener("click", () => {
      const text = this.terminalStream.innerText;
      if (window.electronAPI) {
        window.electronAPI.copyText(text);
      } else {
        navigator.clipboard.writeText(text);
      }
      this._log("SYS", "Terminal logs copied to clipboard.", "INFO");
      window.soundFX?.playBeep();
    });

    // Quick Protocol Buttons
    document.querySelectorAll(".proto-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cmd = btn.getAttribute("data-cmd");
        if (cmd) {
          window.soundFX?.playBeep();
          this.sendCommand(cmd);
        }
      });
    });
  }

  _initClock() {
    const updateTime = () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} LOCAL`;
      if (this.sysClock) this.sysClock.innerText = timeStr;
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  _initWebSpeechFallback() {
    // 1. Preload and cache speech synthesis voices
    if ("speechSynthesis" in window) {
      const cacheVoices = () => {
        try {
          this.cachedVoices = window.speechSynthesis.getVoices();
        } catch (e) {}
      };
      cacheVoices();
      if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
        window.speechSynthesis.onvoiceschanged = cacheVoices;
      }
    }

    // 2. Microphone capture
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = "en-US";

      this.speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          this._log("MIC.BROWSER", `Transcribed: "${transcript}"`, "INPUT");
          this.sendCommand(transcript);
        }
      };

      this.speechRecognition.onerror = (e) => {
        console.warn("Web Speech API note:", e.error);
        this.btnVoiceMic.classList.remove("active");
      };

      this.speechRecognition.onend = () => {
        this.btnVoiceMic.classList.remove("active");
      };
    }
  }

  _connectWebSocket() {
    this._setWsStatus(false, "CONNECTING...");

    try {
      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
      }

      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log(`[HUD] WebSocket connected to Python Backend at ${this.wsUrl}.`);
        this._setWsStatus(true, "MARK VII // ONLINE");
        this.isReconnecting = false;
        this._log("SYS", "Neural core uplink established. Systems synchronized.", "SUCCESS");
        window.soundFX?.playPowerUp();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleServerMessage(msg);
        } catch (e) {
          console.error("[HUD] JSON parse error:", e);
        }
      };

      this.ws.onclose = () => {
        this._setWsStatus(false, "CORE OFFLINE");
        this._scheduleReconnect();
      };

      this.ws.onerror = () => {
        // Toggle between 127.0.0.1 and localhost for Windows DNS robustness
        this.wsUrl = this.wsUrl.includes("127.0.0.1") ? "ws://localhost:8765" : "ws://127.0.0.1:8765";
        this._setWsStatus(false, "CORE OFFLINE");
      };
    } catch (e) {
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    setTimeout(() => {
      this.isReconnecting = false;
      this._connectWebSocket();
    }, 1500);
  }

  _setWsStatus(online, text) {
    if (!this.wsStatus) return;
    this.wsStatus.classList.toggle("online", online);
    const textEl = this.wsStatus.querySelector(".status-text");
    if (textEl) textEl.innerText = text;
  }

  _handleServerMessage(msg) {
    switch (msg.type) {
      case "handshake":
        this._log("SYS", `Handshake acknowledged. ${msg.system} online.`, "SUCCESS");
        if (msg.telemetry) this._updateTelemetry(msg.telemetry);
        break;

      case "state":
        this.setState(msg.state);
        break;

      case "speak":
        if (msg.text && this.voiceEnabled) {
          this._speakInBrowser(msg.text);
        }
        break;

      case "log":
        this._log(msg.tag, msg.message, msg.level, msg.timestamp);
        // Automatically read aloud any voice response from JARVIS
        if ((msg.tag === "JARVIS" || msg.level === "VOICE") && this.voiceEnabled) {
          this._speakInBrowser(msg.message);
        }
        break;

      case "telemetry":
        this._updateTelemetry(msg.data);
        break;

      default:
        console.log("[HUD] Unknown message:", msg);
    }
  }

  setState(state) {
    this.currentState = state;

    // Remove old state classes
    this.statePill.classList.remove("state-idle", "state-listening", "state-thinking", "state-speaking");

    // Audio Visualizer sync
    if (window.hudVisualizer) {
      window.hudVisualizer.setState(state);
    }

    if (state === "IDLE") {
      this.statePill.classList.add("state-idle");
      this.stateLabel.innerText = "STANDBY // ALL SYSTEMS NOMINAL";
      this.reactorAura.style.background = "radial-gradient(circle, rgba(0, 240, 255, 0.25) 0%, rgba(0, 128, 255, 0.05) 50%, transparent 75%)";
      this.btnVoiceMic.classList.remove("active");
      this.aiCaption.innerText = "Ready for directive. Click microphone or type below.";

    } else if (state === "LISTENING") {
      this.statePill.classList.add("state-listening");
      this.stateLabel.innerText = "◉ LISTENING // CAPTURING AUDIO STREAM...";
      this.reactorAura.style.background = "radial-gradient(circle, rgba(255, 183, 3, 0.35) 0%, rgba(255, 120, 0, 0.08) 50%, transparent 75%)";
      this.btnVoiceMic.classList.add("active");
      this.aiCaption.innerText = "Acoustic receptors capturing audio frequencies...";
      window.soundFX?.playListeningChirp();

    } else if (state === "THINKING") {
      this.statePill.classList.add("state-thinking");
      this.stateLabel.innerText = "⚙ PROCESSING // NEURAL SYNTHESIS VIA GEMINI...";
      this.reactorAura.style.background = "radial-gradient(circle, rgba(189, 0, 255, 0.35) 0%, rgba(100, 0, 255, 0.08) 50%, transparent 75%)";
      this.btnVoiceMic.classList.remove("active");
      this.aiCaption.innerText = "Neural core querying cognitive archives...";
      window.soundFX?.playThinkingPulse();

    } else if (state === "SPEAKING") {
      this.statePill.classList.add("state-speaking");
      this.stateLabel.innerText = "▲ TRANSMITTING // VOCAL BROADCAST ACTIVE...";
      this.reactorAura.style.background = "radial-gradient(circle, rgba(0, 245, 155, 0.35) 0%, rgba(0, 180, 100, 0.08) 50%, transparent 75%)";
      this.btnVoiceMic.classList.remove("active");
      this.aiCaption.innerText = "Vocal synthesis online. Transmitting response.";
      window.soundFX?.playSpeakingChime();
    }
  }

  _updateTelemetry(data) {
    if (!data) return;

    if (data.cpu_percent !== undefined) {
      this.cpuVal.innerText = `${Math.round(data.cpu_percent)}%`;
      this.cpuBar.style.width = `${Math.min(100, data.cpu_percent)}%`;
    }

    if (data.ram_percent !== undefined) {
      this.ramVal.innerText = `${Math.round(data.ram_percent)}%`;
      this.ramBar.style.width = `${Math.min(100, data.ram_percent)}%`;
    }

    if (data.disk_percent !== undefined) {
      this.diskVal.innerText = `${Math.round(data.disk_percent)}%`;
      this.diskBar.style.width = `${Math.min(100, data.disk_percent)}%`;
    }
  }

  _log(tag, message, level = "INFO", timestamp = null) {
    const time = timestamp || new Date().toTimeString().split(" ")[0];
    const logDiv = document.createElement("div");

    let levelClass = "log-sys";
    const lowerTag = (tag || "").toLowerCase();
    if (lowerTag.includes("user")) levelClass = "log-user";
    else if (lowerTag.includes("jarvis")) levelClass = "log-jarvis";
    else if (lowerTag.includes("gemini")) levelClass = "log-gemini";
    else if (lowerTag.includes("automation") || lowerTag.includes("comms")) levelClass = "log-action";
    else if (lowerTag.includes("error") || level === "ERROR") levelClass = "log-error";

    logDiv.className = `log-line ${levelClass}`;
    logDiv.innerHTML = `
      <span class="log-time">[${time}]</span>
      <span class="log-tag">[${tag.toUpperCase()}]</span>
      <span class="log-msg">${this._escapeHtml(message)}</span>
    `;

    this.terminalStream.appendChild(logDiv);
    this.terminalStream.scrollTop = this.terminalStream.scrollHeight;

    this.eventCount++;
    this._updateLogCount();
  }

  _updateLogCount() {
    if (this.logCounter) {
      this.logCounter.innerText = `${this.eventCount} EVENTS LOGGED`;
    }
  }

  _escapeHtml(text) {
    const div = document.createElement("div");
    div.innerText = text;
    return div.innerHTML;
  }

  _handleTransmit() {
    const text = this.cmdInput.value.trim();
    if (!text) return;

    this.cmdInput.value = "";
    window.soundFX?.playBeep();
    this.sendCommand(text);
  }

  _speakInBrowser(text) {
    if (!this.voiceEnabled) return;
    if (!("speechSynthesis" in window)) {
      console.warn("[HUD] Speech synthesis not available in this browser context.");
      return;
    }

    try {
      // 1. Strip markdown, hashes, backticks, URLs and non-ASCII chars
      let cleanText = String(text || "")
        .replace(/[*_~`#]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[^\x00-\x7F]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!cleanText) return;

      // 2. Prevent duplicate speaking within 1.5 seconds
      if (this._lastSpokenText === cleanText && Date.now() - (this._lastSpokenTime || 0) < 1500) {
        return;
      }
      this._lastSpokenText = cleanText;
      this._lastSpokenTime = Date.now();

      // 3. Clear any queued utterance and resume if paused
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // 4. Create SpeechSynthesisUtterance
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;

      // 5. Select best English voice (UK / US / David / George)
      const voices = (this.cachedVoices && this.cachedVoices.length > 0)
        ? this.cachedVoices
        : window.speechSynthesis.getVoices();

      if (voices && voices.length > 0) {
        const preferred = voices.find(v => {
          const name = (v.name || "").toLowerCase();
          const lang = (v.lang || "").toLowerCase();
          return name.includes("david") ||
                 name.includes("george") ||
                 name.includes("natural") ||
                 name.includes("uk") ||
                 lang.startsWith("en-gb") ||
                 lang.startsWith("en-us") ||
                 lang.startsWith("en");
        });
        if (preferred) utterance.voice = preferred;
      }

      // 6. Visualizer & State synchronization
      utterance.onstart = () => {
        this.setState("SPEAKING");
      };

      utterance.onend = () => {
        if (this.currentState === "SPEAKING") {
          this.setState("IDLE");
        }
      };

      utterance.onerror = (e) => {
        console.warn("[HUD] Speech synthesis event warning:", e);
        if (this.currentState === "SPEAKING") {
          this.setState("IDLE");
        }
      };

      // 7. Fix Chromium Garbage Collection bug by pinning to window
      window._activeJarvisUtterance = utterance;

      // 8. Speak
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("[HUD] Browser speech error:", e);
    }
  }

  async sendCommand(text) {
    if (!text) return;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: "query",
        text: text
      }));
    } else {
      // Full Cloud + Client AI Execution Pipeline
      this._log("USER", text, "INPUT");
      this.setState("THINKING");

      // 1. Sync directive to Supabase cloud table (local Python worker picks this up automatically!)
      if (window.jarvisSupabase) {
        await window.jarvisSupabase.queueDirective(text);
        await window.jarvisSupabase.logEvent("USER", text, "INPUT");
        this._log("SUPABASE", `Directive queued in cloud table 'jarvis_directives'.`, "SUCCESS");
      }

      const lower = text.toLowerCase().trim();
      let answer = "";

      // 2. Local PC Application Launch Assist
      if (lower.startsWith("open ") || lower.startsWith("launch ") || lower.startsWith("start ")) {
        const app = lower.replace(/^(open|launch|start)\s+/, "").trim();
        if (app.includes("discord")) {
          answer = "Executing launch protocol for Discord, Sir.";
          window.open("https://discord.com/app", "_blank");
        } else if (app.includes("chrome") || app.includes("browser")) {
          answer = "Accessing Google Chrome web portal, Sir.";
          window.open("https://www.google.com", "_blank");
        } else if (app.includes("steam")) {
          answer = "Initiating Steam gaming client protocol, Sir.";
          window.open("steam://open/main", "_self");
        } else if (app.includes("spotify")) {
          answer = "Deploying Spotify media stream, Sir.";
          window.open("https://open.spotify.com", "_blank");
        } else if (app.includes("youtube")) {
          answer = "Opening YouTube interface, Sir.";
          window.open("https://www.youtube.com", "_blank");
        } else if (app.includes("calculator") || app.includes("calc")) {
          answer = "Calculator directive relayed to local execution grid, Sir.";
        } else {
          answer = `Executing launch protocol for ${app.toUpperCase()}, Sir. Relaying to local execution grid.`;
        }

      // 3. Wikipedia Direct Information Search
      } else if (lower.startsWith("who is ") || lower.startsWith("what is ") || lower.startsWith("tell me about ") || lower.startsWith("wikipedia ")) {
        const topic = lower.replace(/^(who is|what is|tell me about|wikipedia)\s+/, "").replace(/[?!.]+$/, "").trim();
        try {
          const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
          if (wikiRes.ok) {
            const wikiData = await wikiRes.json();
            answer = wikiData.extract ? `According to public archives: ${wikiData.extract.split(". ").slice(0, 2).join(". ")}.` : `Sir, multiple entries exist for ${topic}.`;
          } else {
            answer = `Sir, I searched public archives but could not locate an immediate record for ${topic}.`;
          }
        } catch (e) {
          answer = `Sir, public archive telemetry returned an anomaly for ${topic}.`;
        }

      // 4. System Diagnostics & Telemetry
      } else if (lower.includes("status") || lower.includes("diagnostics") || lower.includes("battery") || lower.includes("cpu")) {
        answer = "Sir, all core telemetry parameters are nominal. Supabase cloud database is connected in region ap-south-1.";

      // 5. General Conversational Intelligence
      } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
        answer = "Greetings, Sir. J.A.R.V.I.S. Mark VII is fully operational and synchronized with Supabase cloud memory.";
      } else if (lower.includes("who are you") || lower.includes("your name")) {
        answer = "I am J.A.R.V.I.S., Just A Rather Very Intelligent System, engineered by Stark Industries to assist you with system automation and intelligence.";
      } else if (lower.includes("assist") || lower.includes("help") || lower.includes("what can you do")) {
        answer = "I can control local PC applications, scrape Wikipedia archives, automate communications, monitor hardware telemetry, and synthesize cognitive responses via Gemini.";
      } else {
        answer = `Directive acknowledged, Sir: "${text}". I have logged the sequence and initiated execution pathways.`;
      }

      // 6. Vocal Synthesis & Response Output
      setTimeout(async () => {
        this.setState("SPEAKING");
        this._log("JARVIS", answer, "VOICE");
        this._speakInBrowser(answer);

        if (window.jarvisSupabase) {
          await window.jarvisSupabase.saveConversation(text, answer, "hud_response");
        }
        setTimeout(() => this.setState("IDLE"), 2500);
      }, 400);

      this._connectWebSocket();
    }
  }

  async _loadSupabaseLogs() {
    if (window.jarvisSupabase) {
      try {
        const logs = await window.jarvisSupabase.getRecentLogs(4);
        if (logs && Array.isArray(logs) && logs.length > 0) {
          logs.reverse().forEach((l) => {
            const time = l.created_at ? new Date(l.created_at).toTimeString().split(" ")[0] : null;
            this._log(l.tag || "SYS", l.message || "", l.level || "INFO", time);
          });
        }
      } catch (e) {
        console.warn("[HUD] Could not load Supabase logs:", e);
      }
    }
  }

  _triggerVoiceMic() {
    window.soundFX?.playBeep();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Trigger Python backend listener
      this.ws.send(JSON.stringify({ action: "listen" }));
    } else if (this.speechRecognition) {
      // Browser Web Speech fallback
      try {
        this.btnVoiceMic.classList.add("active");
        this.speechRecognition.start();
        this._log("MIC.BROWSER", "Browser speech recognition engaged...", "INFO");
      } catch (e) {
        this.btnVoiceMic.classList.remove("active");
      }
    } else {
      this._log("SYS", "Microphone interface unavailable. Please verify backend connection.", "ERROR");
    }
  }
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  window.jarvisApp = new JarvisHUDApp();
});
