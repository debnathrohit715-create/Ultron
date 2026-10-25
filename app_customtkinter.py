"""
JARVIS Desktop Application - CustomTkinter Edition
Alternative pure-Python native GUI with Iron Man HUD aesthetic.
"""
import threading
import datetime
import tkinter as tk
import customtkinter as ctk
import psutil
from backend.config import BOT_NAME, USER_NAME
from backend.jarvis_core import JarvisCore

class JarvisCustomTkinterApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        # Window Configuration
        self.title(f"{BOT_NAME} // WORK & DEVELOPER ASSISTANT")
        self.geometry("1100x720")
        self.minsize(900, 600)
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")
        self.configure(fg_color="#060c18")

        # Color Palette
        self.c_bg = "#060c18"
        self.c_card = "#0b1528"
        self.c_cyan = "#00f0ff"
        self.c_blue = "#0080ff"
        self.c_glow = "#1a365d"
        self.c_amber = "#ffb703"
        self.c_green = "#00f59b"
        self.c_red = "#ff0055"
        self.c_purple = "#b5179e"

        # Initialize Backend
        self.jarvis = JarvisCore(
            on_state_change=self._backend_state_callback,
            on_terminal_log=self._backend_log_callback
        )

        self._build_ui()
        self._start_telemetry_loop()

    def _build_ui(self):
        # 1. Top HUD Header
        self.header_frame = ctk.CTkFrame(self, fg_color=self.c_card, corner_radius=10, height=60)
        self.header_frame.pack(fill="x", padx=15, pady=(15, 10))

        self.title_lbl = ctk.CTkLabel(
            self.header_frame,
            text=f"{' . '.join(list(BOT_NAME.upper()))}",
            font=ctk.CTkFont(family="Consolas", size=24, weight="bold"),
            text_color=self.c_cyan
        )
        self.title_lbl.pack(side="left", padx=20, pady=10)

        self.sub_lbl = ctk.CTkLabel(
            self.header_frame,
            text="WORK & DEVELOPER ASSISTANT // v5.0",
            font=ctk.CTkFont(family="Consolas", size=12),
            text_color="#64748b"
        )
        self.sub_lbl.pack(side="left", padx=5, pady=10)

        # Status Pill Indicator
        self.state_badge = ctk.CTkLabel(
            self.header_frame,
            text="● STANDBY // IDLE",
            font=ctk.CTkFont(family="Consolas", size=13, weight="bold"),
            text_color=self.c_cyan,
            fg_color="#0f2b48",
            corner_radius=15,
            padx=16,
            pady=6
        )
        self.state_badge.pack(side="right", padx=20, pady=10)

        # 2. Main Center Body (Split into Left HUD / Arc Reactor and Right Terminal)
        self.main_body = ctk.CTkFrame(self, fg_color="transparent")
        self.main_body.pack(fill="both", expand=True, padx=15, pady=5)

        # Left Column: Arc Reactor & Telemetry
        self.left_panel = ctk.CTkFrame(self.main_body, fg_color=self.c_card, corner_radius=12, width=380)
        self.left_panel.pack(side="left", fill="both", padx=(0, 10), pady=0)

        self.reactor_title = ctk.CTkLabel(
            self.left_panel,
            text="ARC REACTOR CORE TELEMETRY",
            font=ctk.CTkFont(family="Consolas", size=12, weight="bold"),
            text_color=self.c_cyan
        )
        self.reactor_title.pack(pady=(15, 5))

        # Canvas for Animated Arc Reactor
        self.reactor_canvas = tk.Canvas(
            self.left_panel,
            width=220,
            height=220,
            bg=self.c_card,
            highlightthickness=0
        )
        self.reactor_canvas.pack(pady=10)
        self._draw_arc_reactor()

        # Telemetry Gauges
        self.telemetry_frame = ctk.CTkFrame(self.left_panel, fg_color="#07101f", corner_radius=8)
        self.telemetry_frame.pack(fill="x", padx=15, pady=10)

        self.cpu_lbl = ctk.CTkLabel(self.telemetry_frame, text="CPU ALLOCATION: 0%", font=ctk.CTkFont("Consolas", 11), text_color="#94a3b8")
        self.cpu_lbl.pack(anchor="w", padx=12, pady=(8, 2))
        self.cpu_bar = ctk.CTkProgressBar(self.telemetry_frame, progress_color=self.c_cyan, fg_color="#1e293b")
        self.cpu_bar.set(0.15)
        self.cpu_bar.pack(fill="x", padx=12, pady=(0, 8))

        self.ram_lbl = ctk.CTkLabel(self.telemetry_frame, text="NEURAL MEMORY: 0%", font=ctk.CTkFont("Consolas", 11), text_color="#94a3b8")
        self.ram_lbl.pack(anchor="w", padx=12, pady=(4, 2))
        self.ram_bar = ctk.CTkProgressBar(self.telemetry_frame, progress_color=self.c_blue, fg_color="#1e293b")
        self.ram_bar.set(0.40)
        self.ram_bar.pack(fill="x", padx=12, pady=(0, 12))

        # Quick Directives Buttons
        self.quick_lbl = ctk.CTkLabel(self.left_panel, text="QUICK PROTOCOLS", font=ctk.CTkFont("Consolas", 11, "bold"), text_color="#64748b")
        self.quick_lbl.pack(pady=(5, 5))

        self.quick_grid = ctk.CTkFrame(self.left_panel, fg_color="transparent")
        self.quick_grid.pack(fill="x", padx=15, pady=5)

        apps = [("Chrome", "open chrome"), ("Discord", "open discord"), ("Steam", "open steam"), ("Calc", "open calculator")]
        for i, (name, cmd) in enumerate(apps):
            btn = ctk.CTkButton(
                self.quick_grid,
                text=name,
                font=ctk.CTkFont("Consolas", 11),
                fg_color="#0e223d",
                hover_color="#174375",
                text_color=self.c_cyan,
                height=30,
                command=lambda c=cmd: self._send_command_async(c)
            )
            btn.grid(row=i//2, column=i%2, padx=4, pady=4, sticky="ew")
        self.quick_grid.columnconfigure(0, weight=1)
        self.quick_grid.columnconfigure(1, weight=1)

        # Right Column: Terminal Console
        self.right_panel = ctk.CTkFrame(self.main_body, fg_color=self.c_card, corner_radius=12)
        self.right_panel.pack(side="right", fill="both", expand=True, pady=0)

        self.term_header = ctk.CTkFrame(self.right_panel, fg_color="transparent")
        self.term_header.pack(fill="x", padx=15, pady=(12, 5))

        self.term_lbl = ctk.CTkLabel(
            self.term_header,
            text="NEURAL TERMINAL OUTPUT // STARKNET LOGS",
            font=ctk.CTkFont(family="Consolas", size=12, weight="bold"),
            text_color=self.c_cyan
        )
        self.term_lbl.pack(side="left")

        self.clear_btn = ctk.CTkButton(
            self.term_header,
            text="CLEAR LOGS",
            font=ctk.CTkFont("Consolas", 10),
            width=80,
            height=24,
            fg_color="#1e293b",
            hover_color="#334155",
            command=self._clear_logs
        )
        self.clear_btn.pack(side="right")

        # Monospaced Terminal Output
        self.terminal_box = ctk.CTkTextbox(
            self.right_panel,
            font=ctk.CTkFont(family="Consolas", size=12),
            fg_color="#030811",
            text_color="#38bdf8",
            corner_radius=8,
            wrap="word"
        )
        self.terminal_box.pack(fill="both", expand=True, padx=15, pady=8)
        self.terminal_box.configure(state="disabled")

        # 3. Bottom Directive Input Bar
        self.input_frame = ctk.CTkFrame(self, fg_color=self.c_card, corner_radius=10, height=65)
        self.input_frame.pack(fill="x", padx=15, pady=(10, 15))

        self.mic_btn = ctk.CTkButton(
            self.input_frame,
            text="🎤 LISTEN",
            font=ctk.CTkFont("Consolas", 13, "bold"),
            fg_color=self.c_blue,
            hover_color=self.c_cyan,
            text_color="#ffffff",
            width=110,
            height=42,
            corner_radius=8,
            command=self._trigger_voice_listen
        )
        self.mic_btn.pack(side="left", padx=(15, 10), pady=10)

        self.command_entry = ctk.CTkEntry(
            self.input_frame,
            placeholder_text="Ask anything or command your PC (e.g. 'Open VS Code', 'Open notepad and type notes', 'Save file', 'Status')...",
            font=ctk.CTkFont("Consolas", 13),
            fg_color="#050e1d",
            text_color="#f8fafc",
            border_color="#1e3a5f",
            height=42
        )
        self.command_entry.pack(side="left", fill="x", expand=True, padx=5, pady=10)
        self.command_entry.bind("<Return>", lambda e: self._on_submit())

        self.send_btn = ctk.CTkButton(
            self.input_frame,
            text="TRANSMIT",
            font=ctk.CTkFont("Consolas", 12, "bold"),
            fg_color="#0e2a4a",
            hover_color="#164375",
            text_color=self.c_cyan,
            width=100,
            height=42,
            corner_radius=8,
            command=self._on_submit
        )
        self.send_btn.pack(side="right", padx=(5, 15), pady=10)

    def _draw_arc_reactor(self, pulse_scale: float = 1.0):
        self.reactor_canvas.delete("all")
        cx, cy = 110, 110
        # Outer Ring
        self.reactor_canvas.create_oval(cx-90, cy-90, cx+90, cy+90, outline="#0d2b45", width=3)
        self.reactor_canvas.create_oval(cx-75, cy-75, cx+75, cy+75, outline="#004080", width=2)
        # Segments
        for i in range(12):
            import math
            angle = i * (2 * math.pi / 12)
            x1 = cx + 65 * math.cos(angle)
            y1 = cy + 65 * math.sin(angle)
            x2 = cx + 85 * math.cos(angle)
            y2 = cy + 85 * math.sin(angle)
            self.reactor_canvas.create_line(x1, y1, x2, y2, fill=self.c_cyan, width=2)
        # Inner Core
        core_r = int(35 * pulse_scale)
        self.reactor_canvas.create_oval(cx-core_r-10, cy-core_r-10, cx+core_r+10, cy+core_r+10, outline="#0080ff", width=2)
        self.reactor_canvas.create_oval(cx-core_r, cy-core_r, cx+core_r, cy+core_r, fill=self.c_cyan, outline="#ffffff", width=2)

    def _backend_state_callback(self, state: str):
        self.after(0, lambda: self._update_state_ui(state))

    def _backend_log_callback(self, tag: str, message: str, level: str):
        self.after(0, lambda: self._append_terminal_log(tag, message, level))

    def _update_state_ui(self, state: str):
        badge_configs = {
            "IDLE": ("● STANDBY // IDLE", self.c_cyan, "#0f2b48", 1.0),
            "LISTENING": ("◉ LISTENING // CAPTURING MIC...", self.c_amber, "#422006", 1.2),
            "THINKING": ("⚙ THINKING // SYNTHESIZING...", self.c_purple, "#3b0764", 1.15),
            "SPEAKING": ("▲ SPEAKING // VOCAL OUTPUT...", self.c_green, "#064e3b", 1.25)
        }
        text, color, bg, scale = badge_configs.get(state, ("● STANDBY", self.c_cyan, "#0f2b48", 1.0))
        self.state_badge.configure(text=text, text_color=color, fg_color=bg)
        self._draw_arc_reactor(scale)

    def _append_terminal_log(self, tag: str, message: str, level: str):
        now = datetime.datetime.now().strftime("%H:%M:%S")
        line = f"[{now}] [{tag.upper()}] {message}\n"
        self.terminal_box.configure(state="normal")
        self.terminal_box.insert("end", line)
        self.terminal_box.see("end")
        self.terminal_box.configure(state="disabled")

    def _clear_logs(self):
        self.terminal_box.configure(state="normal")
        self.terminal_box.delete("1.0", "end")
        self.terminal_box.configure(state="disabled")

    def _on_submit(self):
        text = self.command_entry.get().strip()
        if text:
            self.command_entry.delete(0, "end")
            self._send_command_async(text)

    def _send_command_async(self, text: str):
        threading.Thread(target=self.jarvis.process_query, args=(text,), daemon=True).start()

    def _trigger_voice_listen(self):
        threading.Thread(target=self.jarvis.listen_and_process, daemon=True).start()

    def _start_telemetry_loop(self):
        def _poll():
            try:
                cpu = psutil.cpu_percent()
                ram = psutil.virtual_memory().percent
                self.cpu_lbl.configure(text=f"CPU ALLOCATION: {cpu}%")
                self.cpu_bar.set(cpu / 100.0)
                self.ram_lbl.configure(text=f"NEURAL MEMORY: {ram}%")
                self.ram_bar.set(ram / 100.0)
            except Exception:
                pass
            self.after(2000, _poll)
        self.after(1000, _poll)

if __name__ == "__main__":
    app = JarvisCustomTkinterApp()
    app.mainloop()
