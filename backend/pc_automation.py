import os
import subprocess
import webbrowser
import shutil
from typing import Tuple

class PCAutomation:
    """
    Local PC Automation module for launching Windows applications, utilities,
    and system directives using os and subprocess.
    """
    def __init__(self):
        # Known common Windows application shortcuts and executable targets
        self.app_registry = {
            "chrome": ["chrome", "google chrome", "google-chrome"],
            "edge": ["msedge", "microsoft edge"],
            "firefox": ["firefox", "mozilla firefox"],
            "discord": ["discord", "discord.exe"],
            "steam": ["steam", "steam.exe"],
            "spotify": ["spotify", "spotify.exe"],
            "vscode": ["code", "visual studio code", "vs code"],
            "notepad": ["notepad", "notepad.exe"],
            "calculator": ["calc", "calc.exe", "calculator"],
            "explorer": ["explorer", "explorer.exe", "my computer", "this pc"],
            "task manager": ["taskmgr", "task manager", "taskmgr.exe"],
            "terminal": ["wt", "windows terminal", "cmd", "powershell"],
            "settings": ["ms-settings:"],
        }

    def launch_app(self, command_text: str) -> Tuple[bool, str]:
        """
        Parses command and opens the requested application using subprocess/os.
        Returns (success_flag, spoken_response).
        """
        lower_cmd = command_text.lower().strip()

        # Remove voice trigger keywords
        for trigger in ["open ", "launch ", "start ", "run ", "bring up "]:
            if lower_cmd.startswith(trigger):
                lower_cmd = lower_cmd[len(trigger):].strip()
                break

        # Check for web address in command (e.g. "open youtube", "open google", "open reddit.com")
        web_sites = {
            "youtube": "https://www.youtube.com",
            "google": "https://www.google.com",
            "github": "https://www.github.com",
            "reddit": "https://www.reddit.com",
            "chatgpt": "https://chatgpt.com",
            "netflix": "https://www.netflix.com",
            "gmail": "https://mail.google.com",
        }
        for site_key, site_url in web_sites.items():
            if site_key in lower_cmd:
                webbrowser.open(site_url)
                return True, f"Opening {site_key.capitalize()} in your default browser, Sir."

        # Handle specific applications
        if "chrome" in lower_cmd or "google chrome" in lower_cmd:
            return self._launch_chrome()
        elif "discord" in lower_cmd:
            return self._launch_discord()
        elif "steam" in lower_cmd:
            return self._launch_steam()
        elif "spotify" in lower_cmd:
            return self._launch_spotify()
        elif "notepad" in lower_cmd:
            return self._launch_notepad()
        elif "calculator" in lower_cmd or "calc" in lower_cmd:
            return self._launch_calculator()
        elif "vscode" in lower_cmd or "vs code" in lower_cmd or "code" in lower_cmd:
            return self._launch_vscode()
        elif "task manager" in lower_cmd or "taskmgr" in lower_cmd:
            return self._launch_taskmgr()
        elif "explorer" in lower_cmd or "files" in lower_cmd:
            subprocess.Popen("explorer.exe")
            return True, "Opening File Explorer, Sir."
        elif "settings" in lower_cmd:
            os.system("start ms-settings:")
            return True, "Accessing Windows Settings, Sir."
        elif "lock" in lower_cmd and ("pc" in lower_cmd or "workstation" in lower_cmd or "screen" in lower_cmd):
            subprocess.run("rundll32.exe user32.dll,LockWorkStation", shell=True)
            return True, "Locking workstation immediately, Sir."

        # Generic attempt using Windows 'start'
        try:
            target = lower_cmd.split()[0]
            os.system(f"start {target}")
            return True, f"Executing launch sequence for {target}, Sir."
        except Exception as e:
            return False, f"Sir, I could not initialize {lower_cmd}: {str(e)[:80]}."

    def _launch_chrome(self) -> Tuple[bool, str]:
        # Try direct executable or protocol
        chrome_paths = [
            os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
        ]
        for path in chrome_paths:
            if os.path.exists(path):
                subprocess.Popen([path])
                return True, "Launching Google Chrome, Sir."

        # Fallback to start command or webbrowser
        try:
            os.system("start chrome")
            return True, "Initializing Google Chrome, Sir."
        except Exception:
            webbrowser.open("https://www.google.com")
            return True, "Opening default browser, Sir."

    def _launch_discord(self) -> Tuple[bool, str]:
        # Discord URI scheme or local update.exe
        discord_local = os.path.expandvars(r"%LocalAppData%\Discord\Update.exe")
        if os.path.exists(discord_local):
            subprocess.Popen([discord_local, "--processStart", "Discord.exe"])
            return True, "Launching Discord, Sir."

        try:
            os.system("start discord:")
            return True, "Opening Discord protocol, Sir."
        except Exception:
            webbrowser.open("https://discord.com/app")
            return True, "Navigating to Discord Web, Sir."

    def _launch_steam(self) -> Tuple[bool, str]:
        steam_paths = [
            os.path.expandvars(r"%ProgramFiles(x86)%\Steam\steam.exe"),
            os.path.expandvars(r"%ProgramFiles%\Steam\steam.exe"),
        ]
        for path in steam_paths:
            if os.path.exists(path):
                subprocess.Popen([path])
                return True, "Initializing Steam, Sir."

        try:
            os.system("start steam://open/main")
            return True, "Launching Steam interface, Sir."
        except Exception:
            return False, "Sir, Steam installation path was not detected."

    def _launch_spotify(self) -> Tuple[bool, str]:
        spotify_path = os.path.expandvars(r"%AppData%\Spotify\Spotify.exe")
        if os.path.exists(spotify_path):
            subprocess.Popen([spotify_path])
            return True, "Launching Spotify, Sir."

        try:
            os.system("start spotify:")
            return True, "Opening Spotify, Sir."
        except Exception:
            webbrowser.open("https://open.spotify.com")
            return True, "Opening Spotify Web, Sir."

    def _launch_notepad(self) -> Tuple[bool, str]:
        subprocess.Popen("notepad.exe")
        return True, "Opening Notepad, Sir."

    def _launch_calculator(self) -> Tuple[bool, str]:
        subprocess.Popen("calc.exe")
        return True, "Calculator active, Sir."

    def _launch_vscode(self) -> Tuple[bool, str]:
        if shutil.which("code"):
            subprocess.Popen(["code"])
            return True, "Initializing Visual Studio Code, Sir."
        os.system("start code")
        return True, "Opening Visual Studio Code, Sir."

    def _launch_taskmgr(self) -> Tuple[bool, str]:
        subprocess.Popen("taskmgr.exe")
        return True, "Deploying Task Manager diagnostics, Sir."
