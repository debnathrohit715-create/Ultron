import os
import sys
import time
import re
import difflib
import threading
import subprocess
import webbrowser
import shutil
from typing import Tuple, Optional, Dict, List

import pyautogui
import pyperclip

try:
    import pygetwindow as gw
except Exception:
    gw = None

try:
    import win32gui
    import win32con
    import win32process
except Exception:
    win32gui = None
    win32con = None
    win32process = None

from backend.config import USER_NAME, BOT_NAME

pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0.05

class PCAutomation:
    """
    Comprehensive PC Automation Engine:
    1. Indexes and opens ANY application or utility installed on the Windows device.
    2. Controls applications: focuses windows, types text/code, executes keyboard shortcuts,
       navigates browsers, manages windows, and executes compound user directives.
    """
    def __init__(self):
        self.app_index: Dict[str, Dict[str, str]] = {}
        self._index_lock = threading.Lock()

        # Built-in direct alias mappings for quick developer & productivity workflows
        self.common_aliases = {
            # Development & Coding Tools
            "code": "code",
            "vscode": "code",
            "vs code": "code",
            "visual studio code": "code",
            "visual studio": "devenv",
            "pycharm": "pycharm",
            "intellij": "idea",
            "idea": "idea",
            "sublime": "subl",
            "sublime text": "subl",
            "webstorm": "webstorm",
            "android studio": "studio64",
            "postman": "postman",
            "docker": "Docker Desktop",
            "docker desktop": "Docker Desktop",
            "git bash": "git-bash",
            "git": "git-bash",
            "terminal": "wt",
            "windows terminal": "wt",
            "wt": "wt",
            "cmd": "cmd.exe",
            "command prompt": "cmd.exe",
            "powershell": "powershell.exe",

            # Web Browsers
            "chrome": "chrome",
            "google chrome": "chrome",
            "browser": "chrome",
            "edge": "msedge",
            "msedge": "msedge",
            "microsoft edge": "msedge",
            "brave": "brave",
            "brave browser": "brave",
            "firefox": "firefox",
            "mozilla firefox": "firefox",

            # Daily Productivity & Utilities
            "notepad": "notepad.exe",
            "notes": "notepad.exe",
            "text editor": "notepad.exe",
            "notepad++": "notepad++.exe",
            "calculator": "calc.exe",
            "calc": "calc.exe",
            "explorer": "explorer.exe",
            "file explorer": "explorer.exe",
            "files": "explorer.exe",
            "this pc": "explorer.exe",
            "my computer": "explorer.exe",
            "task manager": "taskmgr.exe",
            "taskmgr": "taskmgr.exe",
            "settings": "ms-settings:",
            "windows settings": "ms-settings:",
            "control panel": "control",
            "paint": "mspaint.exe",
            "mspaint": "mspaint.exe",
            "snipping tool": "snippingtool.exe",
            "snip": "snippingtool.exe",
            "camera": "microsoft.windows.camera:",

            # Communications & Media
            "discord": "Discord",
            "slack": "Slack",
            "spotify": "Spotify",
            "music": "Spotify",
            "steam": "Steam",
            "whatsapp": "WhatsApp",
            "zoom": "Zoom",
            "teams": "Microsoft Teams",
            "obsidian": "Obsidian",
            "notion": "Notion",
            "figma": "Figma",
            "blender": "Blender",

            # Microsoft Office
            "word": "winword.exe",
            "winword": "winword.exe",
            "excel": "excel.exe",
            "spreadsheet": "excel.exe",
            "powerpoint": "powerpnt.exe",
            "ppt": "powerpnt.exe",
        }

        # Initialize base known shortcuts
        for alias, target in self.common_aliases.items():
            self.app_index[alias.lower()] = {
                "name": alias,
                "target": target,
                "type": "alias"
            }

        # Start background indexing of all system apps
        threading.Thread(target=self._index_all_system_apps, daemon=True).start()

    def _index_all_system_apps(self):
        """Discovers all installed desktop & modern UWP apps on the machine."""
        found = {}

        # 1. Start Menu Shortcuts (.lnk)
        start_folders = [
            os.path.expandvars(r"%ProgramData%\Microsoft\Windows\Start Menu\Programs"),
            os.path.expandvars(r"%AppData%\Microsoft\Windows\Start Menu\Programs"),
            os.path.expandvars(r"%ProgramFiles%"),
            os.path.expandvars(r"%ProgramFiles(x86)%"),
        ]
        for folder in start_folders:
            if os.path.exists(folder):
                for root, _, files in os.walk(folder):
                    for f in files:
                        if f.lower().endswith(".lnk"):
                            app_name = f[:-4].strip()
                            full_path = os.path.join(root, f)
                            clean_key = self._clean_app_key(app_name)
                            if clean_key and clean_key not in found:
                                found[clean_key] = {
                                    "name": app_name,
                                    "target": full_path,
                                    "type": "lnk"
                                }

        # 2. Modern Windows Store / UWP Apps via PowerShell Get-StartApps
        try:
            ps_cmd = 'Get-StartApps | ForEach-Object { "$($_.Name)|$($_.AppID)" }'
            proc = subprocess.run(
                ["powershell", "-NoProfile", "-Command", ps_cmd],
                capture_output=True,
                text=True,
                timeout=12
            )
            for line in proc.stdout.strip().splitlines():
                if "|" in line:
                    name, app_id = line.split("|", 1)
                    name = name.strip()
                    app_id = app_id.strip()
                    if name and app_id:
                        clean_key = self._clean_app_key(name)
                        if clean_key and clean_key not in found:
                            found[clean_key] = {
                                "name": name,
                                "target": app_id,
                                "type": "uwp"
                            }
        except Exception as e:
            print(f"[PC_AUTOMATION] Modern app indexing note: {e}")

        # Merge discovered apps into master index
        with self._index_lock:
            for k, v in found.items():
                if k not in self.app_index:
                    self.app_index[k] = v

        print(f"[PC_AUTOMATION] Application Index loaded with {len(self.app_index)} available applications.")

    def _clean_app_key(self, name: str) -> str:
        """Normalizes an application name for indexing and lookup."""
        name = name.lower()
        # Remove version strings and brackets
        name = re.sub(r"\(.*?\)", "", name)
        name = re.sub(r"\[.*?\]", "", name)
        name = re.sub(r"v\d+(\.\d+)*", "", name)
        name = re.sub(r"[^a-z0-9\s]", " ", name)
        return " ".join(name.split())

    # =========================================================================
    # APPLICATION RESOLUTION & LAUNCHING
    # =========================================================================

    def resolve_app(self, query: str) -> Optional[Dict[str, str]]:
        """
        Finds the matching application from the device index using exact,
        substring, alias, and fuzzy match strategies.
        """
        clean_q = self._clean_app_key(query)
        if not clean_q:
            return None

        # Check direct common aliases
        if clean_q in self.common_aliases:
            target = self.common_aliases[clean_q]
            return {"name": target, "target": target, "type": "alias"}

        with self._index_lock:
            # 1. Exact match
            if clean_q in self.app_index:
                return self.app_index[clean_q]

            # 2. Substring match
            for key, app_data in self.app_index.items():
                if clean_q in key or key in clean_q:
                    return app_data

            # 3. Fuzzy matching
            matches = difflib.get_close_matches(clean_q, list(self.app_index.keys()), n=1, cutoff=0.55)
            if matches:
                return self.app_index[matches[0]]

        # 4. Check if available on system PATH
        path_target = shutil.which(clean_q) or shutil.which(f"{clean_q}.exe")
        if path_target:
            return {"name": clean_q, "target": path_target, "type": "exe"}

        return None

    def launch_app(self, command_text: str) -> Tuple[bool, str]:
        """
        Parses command and opens the requested application or website on the device.
        Returns (success_flag, spoken_response).
        """
        raw_cmd = command_text.strip()
        lower_cmd = raw_cmd.lower()

        # Remove voice trigger keywords
        for trigger in ["open ", "launch ", "start ", "run ", "bring up ", "fire up "]:
            if lower_cmd.startswith(trigger):
                lower_cmd = lower_cmd[len(trigger):].strip()
                break

        # Check for websites and web destinations
        web_sites = {
            "youtube": "https://www.youtube.com",
            "google": "https://www.google.com",
            "github": "https://www.github.com",
            "stackoverflow": "https://stackoverflow.com",
            "stack overflow": "https://stackoverflow.com",
            "reddit": "https://www.reddit.com",
            "chatgpt": "https://chatgpt.com",
            "netflix": "https://www.netflix.com",
            "gmail": "https://mail.google.com",
            "twitter": "https://twitter.com",
            "linkedin": "https://www.linkedin.com",
        }
        for site_key, site_url in web_sites.items():
            if site_key in lower_cmd:
                webbrowser.open(site_url)
                return True, f"Opening {site_key.capitalize()} in your default browser for you, {USER_NAME}!"

        # Handle explicit URL (e.g. open https://... or open example.com)
        url_match = re.search(r"https?://\S+|[a-zA-Z0-9.-]+\.(?:com|org|io|dev|net|ai|app)\S*", lower_cmd)
        if url_match:
            url = url_match.group(0)
            if not url.startswith("http"):
                url = "https://" + url
            webbrowser.open(url)
            return True, f"Navigating to {url} right now, {USER_NAME}!"

        # Special system actions
        if "lock" in lower_cmd and any(w in lower_cmd for w in ["pc", "workstation", "screen", "computer"]):
            subprocess.run("rundll32.exe user32.dll,LockWorkStation", shell=True)
            return True, f"Locking your workstation right now, {USER_NAME}!"

        # Resolve installed application
        app_info = self.resolve_app(lower_cmd)
        if app_info:
            app_name = app_info["name"]
            target = app_info["target"]
            app_type = app_info.get("type", "")

            try:
                if app_type == "uwp":
                    subprocess.Popen(["explorer.exe", f"shell:AppsFolder\\{target}"])
                elif app_type == "lnk":
                    os.startfile(target)
                elif target.startswith("ms-"):
                    os.system(f"start {target}")
                elif shutil.which(target):
                    subprocess.Popen([shutil.which(target)])
                else:
                    try:
                        os.startfile(target)
                    except Exception:
                        subprocess.Popen(f'start "" "{target}"', shell=True)

                return True, f"Got it! Launching {app_name} for you, {USER_NAME}!"
            except Exception as e:
                # Fallback to Windows start
                try:
                    os.system(f'start "" "{target}"')
                    return True, f"Opening {app_name} for you, {USER_NAME}!"
                except Exception as ex:
                    return False, f"I found {app_name}, but ran into an error launching it: {str(ex)[:70]}."

        # Fallback generic launch attempt
        try:
            target = lower_cmd.split()[0]
            os.system(f'start "" "{target}"')
            return True, f"Launching {target} for you, {USER_NAME}!"
        except Exception as e:
            return False, f"I couldn't locate '{lower_cmd}' on your device, {USER_NAME}. Could you check the application name?"

    # =========================================================================
    # APPLICATION USE & INTERACTION CONTROLS
    # =========================================================================

    def focus_app(self, app_name: str) -> bool:
        """
        Brings the window of the specified application to the foreground.
        Uses pygetwindow, win32gui, and PowerShell AppActivate fallbacks.
        """
        query = app_name.lower().strip()

        # Attempt 1: pygetwindow
        if gw:
            try:
                matching_windows = [w for w in gw.getAllWindows() if query in w.title.lower()]
                if matching_windows:
                    win = matching_windows[0]
                    if win.isMinimized:
                        win.restore()
                    win.activate()
                    time.sleep(0.2)
                    return True
            except Exception:
                pass

        # Attempt 2: win32gui
        if win32gui:
            target_hwnd = None
            def _enum_handler(hwnd, _):
                nonlocal target_hwnd
                if win32gui.IsWindowVisible(hwnd):
                    title = win32gui.GetWindowText(hwnd).lower()
                    if title and query in title:
                        target_hwnd = hwnd
                        return False
                return True

            try:
                win32gui.EnumWindows(_enum_handler, None)
            except Exception:
                pass

            if target_hwnd:
                try:
                    win32gui.ShowWindow(target_hwnd, win32con.SW_RESTORE)
                    win32gui.SetForegroundWindow(target_hwnd)
                    time.sleep(0.2)
                    return True
                except Exception:
                    pass

        # Attempt 3: PowerShell AppActivate
        try:
            cmd = f'(New-Object -ComObject WScript.Shell).AppActivate("{app_name}")'
            res = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=3)
            if "True" in res.stdout:
                time.sleep(0.2)
                return True
        except Exception:
            pass

        return False

    def type_text(self, text: str, into_app: Optional[str] = None) -> Tuple[bool, str]:
        """
        Types or pastes text directly into the specified application or active window.
        Uses clipboard pasting for instant, 100% reliable Unicode and newline preservation.
        """
        if not text:
            return False, f"What text would you like me to type, {USER_NAME}?"

        if into_app:
            focused = self.focus_app(into_app)
            if not focused:
                # If not currently running, launch it first
                self.launch_app(f"open {into_app}")
                time.sleep(1.2)
                self.focus_app(into_app)

        time.sleep(0.25)
        try:
            # Save previous clipboard to preserve user's workflow
            old_clip = ""
            try:
                old_clip = pyperclip.paste()
            except Exception:
                pass

            # Paste text using clipboard for lightning fast and accurate entry
            pyperclip.copy(text)
            pyautogui.hotkey("ctrl", "v")
            time.sleep(0.1)

            # Restore original clipboard after short delay
            if old_clip:
                threading.Timer(0.8, lambda: pyperclip.copy(old_clip)).start()

            target_msg = f"into {into_app}" if into_app else "for you"
            return True, f"Done! I've typed that {target_msg}, {USER_NAME}."
        except Exception as e:
            return False, f"Sorry {USER_NAME}, I ran into an issue typing the text: {str(e)[:70]}."

    def execute_shortcut(self, shortcut_name: str, app_name: Optional[str] = None) -> Tuple[bool, str]:
        """
        Executes common keyboard shortcuts inside the target application or active window.
        """
        if app_name:
            self.focus_app(app_name)
            time.sleep(0.2)

        shortcut = shortcut_name.lower().strip()

        shortcuts_map = {
            "save": (["ctrl", "s"], "Saved the file for you!"),
            "save file": (["ctrl", "s"], "Saved the file for you!"),
            "new file": (["ctrl", "n"], "Created a new file!"),
            "new tab": (["ctrl", "t"], "Opened a new tab!"),
            "close tab": (["ctrl", "w"], "Closed the current tab!"),
            "undo": (["ctrl", "z"], "Undid the last action!"),
            "redo": (["ctrl", "y"], "Redid the action!"),
            "select all": (["ctrl", "a"], "Selected all content!"),
            "copy": (["ctrl", "c"], "Copied to clipboard!"),
            "paste": (["ctrl", "v"], "Pasted clipboard content!"),
            "find": (["ctrl", "f"], "Opened find dialog!"),
            "search": (["ctrl", "f"], "Opened find search!"),
            "format code": (["shift", "alt", "f"], "Formatted your code!"),
            "format document": (["shift", "alt", "f"], "Formatted your document!"),
            "toggle terminal": (["ctrl", "`"], "Toggled integrated terminal!"),
            "open terminal": (["ctrl", "`"], "Toggled terminal in editor!"),
            "command palette": (["ctrl", "shift", "p"], "Opened command palette!"),
            "refresh": (["f5"], "Refreshed!"),
            "reload": (["f5"], "Reloaded page!"),
            "run": (["f5"], "Executing run command!"),
            "switch window": (["alt", "tab"], "Switched active window!"),
            "close window": (["alt", "f4"], "Closed window!"),
        }

        for key, (keys, msg) in shortcuts_map.items():
            if shortcut == key or key in shortcut:
                pyautogui.hotkey(*keys)
                return True, msg

        # Fallback to single key press
        single_keys = ["enter", "tab", "esc", "escape", "space", "backspace", "delete", "up", "down", "left", "right"]
        for sk in single_keys:
            if sk in shortcut:
                mapped_key = "escape" if sk == "esc" else sk
                pyautogui.press(mapped_key)
                return True, f"Pressed {mapped_key.capitalize()}!"

        return False, f"I couldn't identify shortcut '{shortcut_name}', {USER_NAME}."

    def maximize_app(self, app_name: Optional[str] = None) -> Tuple[bool, str]:
        """Maximizes the target window or active window."""
        if app_name:
            self.focus_app(app_name)
            time.sleep(0.2)
        pyautogui.hotkey("win", "up")
        return True, f"Maximized window for you, {USER_NAME}!"

    def minimize_app(self, app_name: Optional[str] = None) -> Tuple[bool, str]:
        """Minimizes the target window or active window."""
        if app_name:
            self.focus_app(app_name)
            time.sleep(0.2)
        pyautogui.hotkey("win", "down")
        return True, f"Minimized window for you, {USER_NAME}!"

    def close_app(self, app_name: Optional[str] = None) -> Tuple[bool, str]:
        """Closes the specified application or current window."""
        if not app_name:
            pyautogui.hotkey("alt", "f4")
            return True, f"Closed active window, {USER_NAME}."

        focused = self.focus_app(app_name)
        if focused:
            pyautogui.hotkey("alt", "f4")
            return True, f"Closed {app_name} for you, {USER_NAME}!"

        # Try process taskkill by name
        clean_name = app_name.replace(".exe", "").strip()
        try:
            subprocess.run(f"taskkill /IM {clean_name}.exe /F", shell=True, capture_output=True)
            return True, f"Closed {app_name} for you, {USER_NAME}!"
        except Exception as e:
            return False, f"Could not close {app_name}: {str(e)[:70]}."

    def scroll(self, direction: str = "down", amount: int = 500) -> Tuple[bool, str]:
        """Scrolls up or down in the currently focused application."""
        scroll_amount = -amount if direction.lower() == "down" else amount
        pyautogui.scroll(scroll_amount)
        return True, f"Scrolled {direction} for you, {USER_NAME}!"

    def get_clipboard_content(self) -> Tuple[bool, str]:
        """Reads text content currently stored in the Windows clipboard."""
        try:
            content = pyperclip.paste().strip()
            if not content:
                return True, f"Your clipboard is currently empty, {USER_NAME}."
            preview = content[:200] + ("..." if len(content) > 200 else "")
            return True, f"Your clipboard contains: {preview}"
        except Exception as e:
            return False, f"Could not read clipboard: {e}"

    def search_web_topic(self, query: str, platform: str = "google") -> Tuple[bool, str]:
        """Performs a web search across popular platforms."""
        clean_q = query.strip()
        encoded = clean_q.replace(" ", "+")

        urls = {
            "google": f"https://www.google.com/search?q={encoded}",
            "youtube": f"https://www.youtube.com/results?search_query={encoded}",
            "github": f"https://github.com/search?q={encoded}",
            "stackoverflow": f"https://stackoverflow.com/search?q={encoded}",
            "chatgpt": f"https://chatgpt.com/?q={encoded}",
        }
        target_url = urls.get(platform.lower(), urls["google"])
        webbrowser.open(target_url)
        return True, f"Searching for '{clean_q}' on {platform.capitalize()} right now, {USER_NAME}!"

    # =========================================================================
    # COMPOUND DIRECTIVE PARSING & EXECUTION
    # =========================================================================

    def parse_and_execute_directive(self, command: str) -> Optional[Tuple[bool, str]]:
        """
        Parses complex, multi-action, and application control directives.
        Returns (success, spoken_response) if matched, or None to fall back.
        """
        cmd = command.strip()
        lower_cmd = cmd.lower()

        # 1. Compound: "open [app] and type [text]" / "open [app] and write [text]"
        open_and_type_match = re.match(
            r"^(?:open|launch|start)\s+(.*?)\s+and\s+(?:type|write|paste|enter)\s+(.*)$",
            cmd,
            re.IGNORECASE
        )
        if open_and_type_match:
            target_app = open_and_type_match.group(1).strip()
            content_to_type = open_and_type_match.group(2).strip().strip("'\"")
            # Step 1: Launch application
            self.launch_app(f"open {target_app}")
            time.sleep(1.5)
            # Step 2: Focus and type
            self.focus_app(target_app)
            time.sleep(0.3)
            return self.type_text(content_to_type, into_app=target_app)

        # 2. Compound: "open [app] and search for [query]"
        open_and_search_match = re.match(
            r"^(?:open|launch)\s+(chrome|browser|google|youtube|github|stackoverflow)\s+and\s+search(?:\s+for)?\s+(.*)$",
            cmd,
            re.IGNORECASE
        )
        if open_and_search_match:
            platform = open_and_search_match.group(1).strip()
            query = open_and_search_match.group(2).strip()
            return self.search_web_topic(query, platform=platform)

        # 3. Direct Search on Platform: "search [query] on [platform]" or "search google for [query]"
        search_on_match = re.match(
            r"^search(?:\s+for)?\s+(.*?)\s+on\s+(google|youtube|github|stackoverflow|chatgpt)$",
            cmd,
            re.IGNORECASE
        )
        if search_on_match:
            query = search_on_match.group(1).strip()
            platform = search_on_match.group(2).strip()
            return self.search_web_topic(query, platform=platform)

        search_platform_match = re.match(
            r"^search\s+(google|youtube|github|stackoverflow|chatgpt)\s+for\s+(.*)$",
            cmd,
            re.IGNORECASE
        )
        if search_platform_match:
            platform = search_platform_match.group(1).strip()
            query = search_platform_match.group(2).strip()
            return self.search_web_topic(query, platform=platform)

        # 4. App Typing Directive: "type [text]" or "write [text]" or "in [app] type [text]"
        in_app_type = re.match(r"^in\s+(.*?)\s+(?:type|write|paste)\s+(.*)$", cmd, re.IGNORECASE)
        if in_app_type:
            app_name = in_app_type.group(1).strip()
            text_to_type = in_app_type.group(2).strip().strip("'\"")
            return self.type_text(text_to_type, into_app=app_name)

        if lower_cmd.startswith("type ") or lower_cmd.startswith("write "):
            for prefix in ["type ", "write "]:
                if lower_cmd.startswith(prefix):
                    text_to_type = cmd[len(prefix):].strip().strip("'\"")
                    return self.type_text(text_to_type)

        # 5. Window Switching & Focusing: "switch to [app]" / "focus [app]" / "bring up [app]"
        focus_match = re.match(r"^(?:switch to|focus|bring up|go to)\s+(.+)$", cmd, re.IGNORECASE)
        if focus_match:
            target_app = focus_match.group(1).strip()
            # If target app is not a web url or generic keyword
            if not any(k in target_app.lower() for k in ["http", "tab", "window", "line"]):
                success = self.focus_app(target_app)
                if success:
                    return True, f"Switched to {target_app} for you, {USER_NAME}!"
                else:
                    # Try launching it if not currently open
                    return self.launch_app(f"open {target_app}")

        # 6. Window State Controls: maximize, minimize, close
        if lower_cmd in ["maximize", "maximize window", "maximize app", "full screen"]:
            return self.maximize_app()

        if lower_cmd in ["minimize", "minimize window", "minimize app"]:
            return self.minimize_app()

        if lower_cmd.startswith("close "):
            target = lower_cmd[len("close "):].strip()
            if target in ["window", "this window", "active window", "it"]:
                return self.close_app(None)
            return self.close_app(target)

        # 7. Common Keyboard Shortcuts
        known_shortcuts = [
            "save", "save file", "new file", "new tab", "close tab",
            "undo", "redo", "select all", "copy", "paste", "find",
            "format code", "format document", "toggle terminal", "open terminal",
            "command palette", "refresh", "reload", "run code"
        ]
        if lower_cmd in known_shortcuts:
            return self.execute_shortcut(lower_cmd)

        # 8. Single Key Press: "press enter", "press tab", "press esc", "press space", "press backspace"
        press_match = re.match(r"^press\s+([a-zA-Z0-9]+)$", lower_cmd)
        if press_match:
            key_name = press_match.group(1)
            return self.execute_shortcut(key_name)

        # 9. Scrolling Controls
        if lower_cmd in ["scroll down", "scroll up"]:
            direction = "down" if "down" in lower_cmd else "up"
            return self.scroll(direction=direction)

        # 10. Clipboard inspection
        if any(w in lower_cmd for w in ["read clipboard", "what is in my clipboard", "show clipboard", "paste clipboard"]):
            return self.get_clipboard_content()

        return None
