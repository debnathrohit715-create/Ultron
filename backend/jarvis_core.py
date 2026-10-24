import datetime
import psutil
from typing import Callable, Optional
from backend.config import USER_NAME
from backend.ai_brain import AIBrain
from backend.voice_io import VoiceOutput, VoiceInput
from backend.info_retrieval import InfoRetriever
from backend.pc_automation import PCAutomation
from backend.comms import CommsManager
from backend.supabase_db import supabase_db

class JarvisCore:
    """
    Central JARVIS Intelligence & Command Orchestrator.
    Coordinates Ears (VoiceInput), Mouth (VoiceOutput), Brain (Gemini),
    Archives (Wikipedia), Hands (PCAutomation), Comms (WhatsApp),
    and Cloud Database Memory (Supabase).
    """
    def __init__(self,
                 on_state_change: Optional[Callable[[str], None]] = None,
                 on_terminal_log: Optional[Callable[[str, str, str], None]] = None,
                 on_speak: Optional[Callable[[str], None]] = None):
        self.on_state_change = on_state_change
        self.on_terminal_log = on_terminal_log
        self.on_speak = on_speak
        self.current_state = "IDLE"

        # Initialize Subsystems
        self._log("SYS", "Initializing Stark Industries Mark VII System Architecture...", "INFO")
        self.brain = AIBrain()
        self.retriever = InfoRetriever()
        self.automation = PCAutomation()
        self.comms = CommsManager()

        # Audio I/O
        self.voice_out = VoiceOutput(
            on_start=self._on_speech_start,
            on_done=self._on_speech_done
        )
        self.voice_in = VoiceInput()

        self._set_state("IDLE")
        self._log("SYS", f"All neural pathways online. Cloud memory synchronized with Supabase. Welcome back, {USER_NAME}.", "SUCCESS")

    def _set_state(self, new_state: str):
        self.current_state = new_state
        if self.on_state_change:
            self.on_state_change(new_state)

    def _log(self, tag: str, message: str, level: str = "INFO"):
        if self.on_terminal_log:
            self.on_terminal_log(tag, message, level)
        # Record into Supabase cloud database
        supabase_db.log_event_async(tag, message, level)

    def _on_speech_start(self, text: str):
        self._set_state("SPEAKING")
        self._log("JARVIS", text, "VOICE")
        if self.on_speak:
            try:
                self.on_speak(text)
            except Exception as e:
                print(f"[JARVIS_CORE] on_speak callback error: {e}")

    def _on_speech_done(self):
        self._set_state("IDLE")

    def process_query(self, user_query: str, source: str = "text") -> str:
        """
        Processes text/voice directive and returns spoken response string.
        Saves query and response to Supabase cloud database.
        """
        query = user_query.strip()
        if not query:
            return ""

        self._log("USER", query, "INPUT")
        self._set_state("THINKING")
        lower_q = query.lower()
        response = ""

        # 1. Stop / Mute Command
        if lower_q in ["stop", "quiet", "shut up", "pause", "be quiet", "silence", "abort"]:
            self.voice_out.clear()
            self._set_state("IDLE")
            response = f"Standing by, {USER_NAME}."
            supabase_db.save_conversation_async(query, response, source)
            return response

        # 2. System Status / Diagnostics Command
        if any(keyword in lower_q for keyword in ["system status", "diagnostics", "battery", "cpu usage", "system report", "telemetry"]):
            response = self.get_system_diagnostics()
            self.voice_out.speak(response)
            supabase_db.save_conversation_async(query, response, source)
            return response

        # 3. WhatsApp Communication Command
        if "whatsapp" in lower_q or (("send message" in lower_q or "message" in lower_q) and any(c.isdigit() for c in lower_q)):
            parsed = self.comms.parse_whatsapp_command(query)
            if parsed:
                phone, msg = parsed
                self._log("COMMS", f"Dispatching WhatsApp payload to {phone}: '{msg}'", "ACTION")
                success, response = self.comms.send_whatsapp(phone, msg)
                self.voice_out.speak(response)
                supabase_db.save_directive_async(query, "SUCCESS" if success else "FAILED", response)
                supabase_db.save_conversation_async(query, response, source)
                return response
            else:
                response = f"Sir, please specify recipient international phone number and message."
                self.voice_out.speak(response)
                supabase_db.save_conversation_async(query, response, source)
                return response

        # 4. PC Application Launching / Automation
        app_launch_triggers = ["open ", "launch ", "start ", "run ", "bring up "]
        if any(lower_q.startswith(trig) for trig in app_launch_triggers) or lower_q in ["lock pc", "lock screen", "calculator", "notepad", "task manager"]:
            self._log("AUTOMATION", f"Resolving execution target for '{query}'", "ACTION")
            success, response = self.automation.launch_app(query)
            self.voice_out.speak(response)
            supabase_db.save_directive_async(query, "SUCCESS" if success else "FAILED", response)
            supabase_db.save_conversation_async(query, response, source)
            return response

        # 5. Wikipedia Research Command
        wiki_triggers = ["who is ", "what is ", "tell me about ", "wikipedia ", "search wiki ", "research "]
        if any(lower_q.startswith(trig) for trig in wiki_triggers) and not any(term in lower_q for term in ["time", "date", "weather"]):
            self._log("WIKI", f"Querying Wikipedia archives: '{query}'", "INFO")
            response = self.retriever.search_and_summarize(query, sentences=2)
            self.voice_out.speak(response)
            supabase_db.save_conversation_async(query, response, source)
            return response

        # 6. General Cognitive Query -> Google Gemini AI Brain
        self._log("GEMINI", f"Neural synthesis via Gemini for '{query}'", "INFO")
        response = self.brain.ask(query)
        self.voice_out.speak(response)
        supabase_db.save_conversation_async(query, response, source)
        return response

    def listen_and_process(self) -> str:
        """
        Activates microphone, captures audio, transcribes, and executes command.
        """
        self._set_state("LISTENING")
        self._log("EARS", "Acoustic receptors active. Listening for input...", "INFO")

        try:
            recognized_text = self.voice_in.listen(duration=5.0)
            if not recognized_text:
                self._set_state("IDLE")
                self._log("EARS", "No audio stream detected or threshold timed out.", "WARNING")
                return ""
            return self.process_query(recognized_text, source="voice")
        except Exception as e:
            self._set_state("IDLE")
            self._log("EARS", f"Acoustic receptor error: {e}", "ERROR")
            err_msg = f"Sir, I encountered an issue accessing the acoustic sensors."
            self.voice_out.speak(err_msg)
            return err_msg

    def get_system_diagnostics(self) -> str:
        """
        Compile hardware telemetry report.
        """
        cpu = psutil.cpu_percent(interval=0.1)
        ram = psutil.virtual_memory().percent
        battery = psutil.sensors_battery()
        bat_str = f"{battery.percent}%" if battery else "Mains AC Power"
        boot_time = datetime.datetime.fromtimestamp(psutil.boot_time()).strftime("%H:%M")

        report = (
            f"Sir, core diagnostics are optimal. CPU utilization is at {cpu} percent, "
            f"memory allocation at {ram} percent, and power grid is on {bat_str}. "
            f"Systems active since {boot_time}."
        )
        return report

    def get_telemetry_data(self) -> dict:
        """
        Returns structured dictionary for HUD telemetry meters.
        """
        cpu = psutil.cpu_percent(interval=None)
        ram = psutil.virtual_memory()
        battery = psutil.sensors_battery()
        disk = psutil.disk_usage('/')

        data = {
            "cpu_percent": cpu,
            "ram_percent": ram.percent,
            "ram_used_gb": round(ram.used / (1024**3), 1),
            "ram_total_gb": round(ram.total / (1024**3), 1),
            "disk_percent": disk.percent,
            "battery_percent": battery.percent if battery else 100,
            "battery_plugged": battery.power_plugged if battery else True,
            "state": self.current_state,
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        # Record into Supabase
        supabase_db.save_telemetry_async(cpu, ram.percent, disk.percent, self.current_state)
        return data
