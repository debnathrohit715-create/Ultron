# J.A.R.V.I.S. // STARK INDUSTRIES MARK VII
### Autonomous Sci-Fi Iron Man Desktop Interface & Voice Assistant

JARVIS is a native standalone desktop application built with a high-performance **Python backend** and an ultra-futuristic **Electron.js Iron Man HUD frontend** (with an alternative pure-Python **CustomTkinter** GUI included).

---

## 🌟 Key Features

1. **Iron Man HUD Visual Experience (Electron.js)**:
   - **Concentric Rotating Arc Reactor**: Multi-tier SVG HUD rings that accelerate, pulsate, and transform based on JARVIS's cognitive state.
   - **Dynamic State Engine**:
     - 🔷 **IDLE / STANDBY**: Gentle cyan ambient plasma glow, steady 60fps telemetry.
     - 🟡 **LISTENING**: Golden-amber acoustic pulse with expanding audio visualizer waves.
     - 🟣 **THINKING**: Hyper-velocity neural spin with violet plasma bloom while querying Google Gemini.
     - 🟢 **SPEAKING**: Dynamic emerald equalizer spectrum bars pulsing in synchronization with vocal output.
   - **Neural Cyber-Terminal**: Monospaced terminal output stream showing live timestamped logs (`[SYS]`, `[USER]`, `[JARVIS]`, `[GEMINI]`, `[ACTION]`).
   - **Hardware Telemetry HUD**: Live CPU utilization, Neural Memory (RAM), Disk allocation, and Battery status.
   - **Procedural Sound FX**: Built-in Web Audio API synthesizer for authentic sci-fi button chirps, reactor hum, and communication chimes without external audio assets.

2. **Core Capabilities & Integrations**:
   - 🎙️ **Voice Input (Ears)**: Captures microphone audio using `SpeechRecognition` with an automatic `sounddevice` fallback (guaranteeing immediate zero-compiler compatibility on Windows).
   - 🔊 **Voice Output (Mouth)**: Offline vocal synthesis via `pyttsx3` (Windows SAPI5) configured with a British AI persona and thread-safe queue.
   - 🧠 **AI Brain**: Integrated with the **Google Gemini API** (`google-genai` / `google-generativeai`) with a Tony Stark system prompt (witty, concise, British intellect, calling the user "Sir").
   - 📚 **Information Retrieval**: Live data scraping and summarization using `wikipedia` with custom User-Agent policy and speech cleanup.
   - 💻 **PC Automation**: Launches local PC software via `os` and `subprocess` (Chrome, Discord, Steam, Spotify, VS Code, Calculator, Notepad, Task Manager, File Explorer, Lock PC).
   - 📲 **Communications**: Sends automated WhatsApp dispatches via `pywhatkit`.

---

## 📁 Project Structure

```
Ultron/
├── .env.example                  # Template for environment variables and API keys
├── .env                          # Configuration file (place your GEMINI_API_KEY here)
├── requirements.txt              # Python dependencies
├── package.json                  # Node.js / Electron configuration & launch scripts
├── main.js                       # Electron main process (spawns Python backend automatically)
├── preload.js                    # Secure Electron IPC bridge
├── app_customtkinter.py          # Standalone pure-Python fallback desktop UI
├── backend/
│   ├── __init__.py
│   ├── config.py                 # Configuration loader (.env, ports, voice rate)
│   ├── ai_brain.py               # Google Gemini AI Brain with Tony Stark JARVIS persona
│   ├── voice_io.py               # Dual-engine Voice Input (SR + sounddevice) & pyttsx3 TTS
│   ├── info_retrieval.py         # Wikipedia scraping & speech summarizer
│   ├── pc_automation.py          # OS & subprocess app launcher (Chrome, Discord, Steam, etc.)
│   ├── comms.py                  # pywhatkit WhatsApp message sender
│   ├── jarvis_core.py            # Central coordinator & query classifier
│   └── server.py                 # Asynchronous WebSocket server (ws://127.0.0.1:8765)
└── frontend/
    ├── index.html                # Iron Man HUD interface
    ├── assets/
    │   └── icon.png              # App icon
    ├── css/
    │   └── hud.css               # Sci-fi neon styling, animations & CRT scanlines
    └── js/
        ├── audio_fx.js           # Procedural Web Audio API sound synthesizer
        ├── visualizer.js         # 60fps canvas audio waveform visualizer
        └── app.js                # HUD controller, WebSocket client & state machine
```

---

## 🚀 Setup & Launch Instructions

### Step 1: Configure your Google Gemini API Key
1. Obtain a free API key from [Google AI Studio](https://aistudio.google.com/).
2. Open the `.env` file in the project root.
3. Paste your key:
   ```env
   GEMINI_API_KEY=AIzaSyYourActualKeyHere12345
   ```

### Step 2: Install Dependencies (Already Pre-installed in this environment)
If setting up on a fresh machine:
```bash
# 1. Create and activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\activate   # Windows

# 2. Install Python packages
pip install -r requirements.txt

# 3. Install Node.js dependencies
npm install
```

### Step 3: Launch the Application

#### Option A (Recommended): Launch the Futuristic Iron Man HUD (Electron)
The Electron app automatically launches the Python backend in the background:
```bash
npm start
```
*(Or use `npm.cmd start` if PowerShell execution policy restricts scripts)*

#### Option B: Launch Full Concurrently Suite
```bash
npm run start:all
```

#### Option C: Alternative Pure-Python Desktop GUI (CustomTkinter)
If you prefer running a 100% Python desktop window without Node.js:
```bash
.\.venv\Scripts\python.exe app_customtkinter.py
```

---

## 🗣️ Voice & Terminal Directives Cheat Sheet

| Directive | Action Executed |
| :--- | :--- |
| `"Open Chrome"` | Launches Google Chrome |
| `"Open Discord"` | Launches Discord desktop app |
| `"Open Steam"` | Launches Steam client |
| `"Open Calculator"` | Opens Windows Calculator |
| `"Open Notepad"` | Opens Windows Notepad |
| `"System status"` | Provides hardware telemetry (CPU, RAM, Power, Uptime) |
| `"Who is Tony Stark"` | Scrapes & summarizes Wikipedia archives |
| `"Tell me about Quantum Computing"` | Scrapes & summarizes Wikipedia |
| `"Send WhatsApp to +1234567890 saying Sir your armor is ready"` | Automates WhatsApp dispatch via `pywhatkit` |
| `"What is the best way to design an iron man suit?"` | Neural synthesis via **Google Gemini AI** |
| `"Stop"` / `"Quiet"` | Clears speech queue and returns to standby |
