import os
import warnings
from backend.config import GEMINI_API_KEY, GEMINI_MODEL, USER_NAME, is_api_key_configured

warnings.filterwarnings("ignore", category=FutureWarning)

JARVIS_SYSTEM_INSTRUCTION = (
    f"You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the sophisticated AI assistant "
    f"engineered by Stark Industries. You are conversing directly with {USER_NAME}. "
    f"Personality & Tone: "
    f"1. Dignified, razor-sharp, sophisticated British intellect with subtle, gentlemanly wit. "
    f"2. Always address the user as '{USER_NAME}'. "
    f"3. Keep spoken replies concise and cinematic (1 to 3 clear sentences) so they sound natural when "
    f"read aloud by your speech synthesis engine. "
    f"4. Avoid markdown bullet lists, asterisks, bold stars, or emojis unless explicitly requested, "
    f"as your text is parsed directly into voice audio. "
    f"5. Maintain an aura of total competence and futuristic technological superiority."
)

FALLBACK_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash"
]

class AIBrain:
    """
    Google Gemini AI Brain Integration for JARVIS.
    Supports both google.genai and legacy google.generativeai with multi-model fallback.
    """
    def __init__(self):
        self.is_ready = False
        self.client_type = None
        self.client = None
        self.chat = None
        self._init_gemini()

    def _init_gemini(self):
        if not is_api_key_configured():
            self.is_ready = False
            return

        # Attempt 1: Modern google.genai SDK
        try:
            from google import genai
            self.client = genai.Client(api_key=GEMINI_API_KEY)
            self.client_type = "google-genai"
            self.is_ready = True
            print(f"[AI_BRAIN] Initialized Google GenAI SDK.")
            return
        except ImportError:
            pass
        except Exception as e:
            print(f"[AI_BRAIN] google.genai initialization note: {e}")

        # Attempt 2: Legacy google.generativeai SDK
        try:
            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=GEMINI_API_KEY)
            self.model = legacy_genai.GenerativeModel(
                model_name=GEMINI_MODEL or "gemini-1.5-flash",
                system_instruction=JARVIS_SYSTEM_INSTRUCTION
            )
            self.client_type = "google-generativeai"
            self.is_ready = True
            print(f"[AI_BRAIN] Initialized legacy google.generativeai.")
        except Exception as e:
            print(f"[AI_BRAIN] Error initializing Gemini model: {e}")
            self.is_ready = False

    def ask(self, prompt: str) -> str:
        """
        Send user query to Gemini and receive JARVIS's spoken response.
        Auto-falls back across active Gemini models if one experiences high demand.
        """
        if not self.is_ready:
            self._init_gemini()

        if not self.is_ready:
            return (
                f"Sir, my cognitive neural core is currently in standby. "
                f"Please provide an active Google Gemini API key in the .env configuration file."
            )

        candidate_models = [GEMINI_MODEL] if GEMINI_MODEL else []
        for m in FALLBACK_MODELS:
            if m not in candidate_models:
                candidate_models.append(m)

        last_error = ""
        for model_name in candidate_models:
            try:
                if self.client_type == "google-genai":
                    response = self.client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config={
                            "system_instruction": JARVIS_SYSTEM_INSTRUCTION,
                            "temperature": 0.7,
                            "max_output_tokens": 300
                        }
                    )
                    text = response.text or ""
                else:
                    response = self.model.generate_content(prompt)
                    text = response.text or ""

                if text:
                    # Clean up residual asterisks or markdown formatting for clean vocal delivery
                    clean_text = text.replace("**", "").replace("*", "").replace("`", "").strip()
                    return clean_text
            except Exception as e:
                last_error = str(e)
                print(f"[AI_BRAIN] Model {model_name} failed: {last_error[:80]}, trying next fallback...")
                continue

        if "quota" in last_error.lower() or "429" in last_error:
            return "Sir, our Gemini API quota threshold has been exceeded. Please check your Google AI Studio quota."
        elif "api_key" in last_error.lower() or "unauthenticated" in last_error.lower():
            return "Sir, the provided Gemini API key appears invalid or unauthorized. Please verify your credentials."
        return f"Sir, I encountered an anomaly while consulting my neural core: {last_error[:120]}."
