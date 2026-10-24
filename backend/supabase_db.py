import os
import threading
from typing import List, Dict, Optional
from supabase import create_client, Client
from backend.config import BASE_DIR
from dotenv import load_dotenv

load_dotenv(BASE_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

class SupabaseManager:
    """
    Manages persistent cloud database operations for JARVIS using Supabase.
    """
    def __init__(self):
        self.client: Optional[Client] = None
        self._is_connected = False
        self._init_client()

    def _init_client(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            print("[SUPABASE] Configuration missing in .env")
            return

        try:
            self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
            self._is_connected = True
            print(f"[SUPABASE] Connected to Cloud Database: {SUPABASE_URL}")
        except Exception as e:
            print(f"[SUPABASE] Initialization error: {e}")
            self._is_connected = False

    def log_event_async(self, tag: str, message: str, level: str = "INFO"):
        """Asynchronously records an audit event to jarvis_logs table."""
        if not self._is_connected or not self.client:
            return

        def _worker():
            try:
                self.client.table("jarvis_logs").insert({
                    "tag": tag,
                    "message": message,
                    "level": level
                }).execute()
            except Exception as e:
                print(f"[SUPABASE] Log error: {e}")

        threading.Thread(target=_worker, daemon=True).start()

    def save_conversation_async(self, query: str, response: str, source: str = "text"):
        """Asynchronously records a conversational exchange to jarvis_conversations."""
        if not self._is_connected or not self.client:
            return

        def _worker():
            try:
                self.client.table("jarvis_conversations").insert({
                    "user_query": query,
                    "jarvis_response": response,
                    "source": source,
                    "state": "COMPLETED"
                }).execute()
            except Exception as e:
                print(f"[SUPABASE] Conversation save error: {e}")

        threading.Thread(target=_worker, daemon=True).start()

    def save_telemetry_async(self, cpu: float, ram: float, disk: float, state: str):
        """Records hardware metrics to jarvis_telemetry."""
        if not self._is_connected or not self.client:
            return

        def _worker():
            try:
                self.client.table("jarvis_telemetry").insert({
                    "cpu_percent": cpu,
                    "ram_percent": ram,
                    "disk_percent": disk,
                    "state": state
                }).execute()
            except Exception:
                pass

        threading.Thread(target=_worker, daemon=True).start()

    def save_directive_async(self, command: str, status: str, result: str):
        """Records system execution directive to jarvis_directives."""
        if not self._is_connected or not self.client:
            return

        def _worker():
            try:
                self.client.table("jarvis_directives").insert({
                    "command": command,
                    "status": status,
                    "result": result
                }).execute()
            except Exception as e:
                print(f"[SUPABASE] Directive save error: {e}")

        threading.Thread(target=_worker, daemon=True).start()

    def get_recent_conversations(self, limit: int = 5) -> List[Dict]:
        """Fetch recent conversation history for memory recall."""
        if not self._is_connected or not self.client:
            return []
        try:
            res = self.client.table("jarvis_conversations").select("*").order("created_at", desc=True).limit(limit).execute()
            return res.data or []
        except Exception as e:
            print(f"[SUPABASE] History fetch error: {e}")
            return []

supabase_db = SupabaseManager()
