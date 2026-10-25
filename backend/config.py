import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# Gemini API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

# User & Bot Persona
BOT_NAME = os.getenv("BOT_NAME", "Nova").strip()
_raw_user = os.getenv("USER_NAME", "Rohit").strip()
USER_NAME = "Rohit" if _raw_user.lower() == "sir" else _raw_user

# Voice Engine Settings
VOICE_RATE = int(os.getenv("VOICE_RATE", os.getenv("JARVIS_VOICE_RATE", "190")))
try:
    VOICE_VOLUME = float(os.getenv("VOICE_VOLUME", os.getenv("JARVIS_VOICE_VOLUME", "1.0")))
except ValueError:
    VOICE_VOLUME = 1.0

# WebSocket Server Settings
SERVER_HOST = os.getenv("HOST", os.getenv("JARVIS_HOST", "127.0.0.1"))
SERVER_PORT = int(os.getenv("PORT", os.getenv("JARVIS_PORT", "8765")))

def is_api_key_configured() -> bool:
    """Returns True if a non-placeholder Gemini API key is provided."""
    return bool(GEMINI_API_KEY and GEMINI_API_KEY != "YOUR_GEMINI_API_KEY_HERE")
