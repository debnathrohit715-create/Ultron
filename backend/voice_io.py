import io
import wave
import queue
import threading
import time
from typing import Callable, Optional
import speech_recognition as sr
import pyttsx3
from backend.config import VOICE_RATE, VOICE_VOLUME

class VoiceOutput:
    """
    Offline Text-to-Speech Engine using pyttsx3 (SAPI5 on Windows).
    Thread-safe worker queue prevents COM apartment threading conflicts.
    """
    def __init__(self, on_start: Optional[Callable[[str], None]] = None,
                 on_done: Optional[Callable[[], None]] = None):
        self.on_start = on_start
        self.on_done = on_done
        self._queue: queue.Queue = queue.Queue()
        self._is_speaking = False
        self._stop_event = threading.Event()
        self._worker_thread = threading.Thread(target=self._speech_worker, daemon=True)
        self._worker_thread.start()

    def _speech_worker(self):
        try:
            import pythoncom
            pythoncom.CoInitialize()
        except Exception:
            pass

        try:
            engine = pyttsx3.init()
            engine.setProperty("rate", VOICE_RATE)
            engine.setProperty("volume", VOICE_VOLUME)

            # Select a friendly, natural English voice (e.g. Zira, Hazel, Eva, or David)
            voices = engine.getProperty("voices")
            friendly_voice = None
            preferred_voice_keys = ["zira", "hazel", "eva", "jenny", "david"]
            for pref in preferred_voice_keys:
                for v in voices:
                    if pref in v.name.lower():
                        friendly_voice = v.id
                        break
                if friendly_voice:
                    break

            if not friendly_voice and voices:
                friendly_voice = voices[0].id
            if friendly_voice:
                engine.setProperty("voice", friendly_voice)
        except Exception as e:
            print(f"[VOICE_OUTPUT] Engine initialization warning: {e}")
            engine = None

        while not self._stop_event.is_set():
            try:
                text = self._queue.get(timeout=0.2)
            except queue.Empty:
                continue

            if text is None:
                break

            self._is_speaking = True
            if self.on_start:
                try:
                    self.on_start(text)
                except Exception:
                    pass

            try:
                if engine:
                    engine.say(text)
                    engine.runAndWait()
                else:
                    # Fallback simulation if audio hardware is completely unavailable
                    time.sleep(max(1.0, len(text.split()) * 0.3))
            except Exception as e:
                print(f"[VOICE_OUTPUT] Speech playback error: {e}")
            finally:
                self._is_speaking = False
                if self.on_done:
                    try:
                        self.on_done()
                    except Exception:
                        pass
                self._queue.task_done()

    def speak(self, text: str):
        """Enqueue text for speech output."""
        if not text or not text.strip():
            return
        self._queue.put(text.strip())

    def is_speaking(self) -> bool:
        return self._is_speaking

    def clear(self):
        """Clear all pending utterances."""
        while not self._queue.empty():
            try:
                self._queue.get_nowait()
                self._queue.task_done()
            except queue.Empty:
                break


class VoiceInput:
    """
    Microphone Audio Capture and Speech Recognition.
    Supports PyAudio when available, with an automatic sounddevice WAV fallback.
    """
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 300
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 0.8

    def listen(self, duration: float = 5.0) -> str:
        """
        Listen to microphone and return transcribed text.
        Returns recognized string or empty string if silence/unintelligible.
        """
        # Attempt 1: Standard SpeechRecognition via PyAudio
        try:
            with sr.Microphone() as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.6)
                audio = self.recognizer.listen(source, timeout=6.0, phrase_time_limit=10.0)
                text = self.recognizer.recognize_google(audio)
                return text.strip()
        except (AttributeError, OSError, ImportError):
            # Fallback to sounddevice
            return self._listen_with_sounddevice(duration)
        except sr.WaitTimeoutError:
            return ""
        except sr.UnknownValueError:
            return ""
        except sr.RequestError as e:
            raise RuntimeError(f"Speech recognition service unreachable: {e}")

    def _listen_with_sounddevice(self, duration: float = 5.0) -> str:
        """
        Sounddevice recording fallback (requires no PyAudio compiler).
        """
        try:
            import sounddevice as sd
            import numpy as np

            sample_rate = 16000
            channels = 1
            frames = int(duration * sample_rate)

            # Record audio into numpy buffer
            recording = sd.rec(frames, samplerate=sample_rate, channels=channels, dtype="int16")
            sd.wait()

            # Package into in-memory WAV container
            wav_io = io.BytesIO()
            with wave.open(wav_io, "wb") as wf:
                wf.setnchannels(channels)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(sample_rate)
                wf.writeframes(recording.tobytes())
            wav_io.seek(0)

            # Process WAV through SpeechRecognition
            with sr.AudioFile(wav_io) as source:
                audio = self.recognizer.record(source)
                text = self.recognizer.recognize_google(audio)
                return text.strip()
        except sr.UnknownValueError:
            return ""
        except Exception as e:
            raise RuntimeError(f"Microphone capture error via sounddevice: {e}")
