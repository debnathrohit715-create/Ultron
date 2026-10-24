import re
import threading
from typing import Tuple, Optional
import pywhatkit

class CommsManager:
    """
    Handles external communications including automated WhatsApp dispatch
    via pywhatkit.
    """
    def __init__(self):
        # Configurable alias phone directory
        self.contacts = {
            "pepper": "+10000000000",
            "rhodey": "+10000000001",
            "happy": "+10000000002"
        }

    def add_contact(self, name: str, phone: str):
        self.contacts[name.lower().strip()] = phone.strip()

    def parse_whatsapp_command(self, text: str) -> Optional[Tuple[str, str]]:
        """
        Extracts phone number / contact name and message from voice command.
        Example formats:
          - "send whatsapp to +1234567890 saying hello sir"
          - "whatsapp +1234567890 message meeting at noon"
          - "send message to +1234567890 that I am arriving"
        """
        clean_text = text.strip()

        # Regex for phone number with optional plus
        phone_match = re.search(r"(\+?\d{10,15})", clean_text)
        recipient = None
        message = ""

        if phone_match:
            recipient = phone_match.group(1)
            # Ensure leading plus
            if not recipient.startswith("+"):
                recipient = "+" + recipient

            # Extract message after 'saying', 'message', 'that', or recipient
            split_patterns = [r"saying\s+(.*)", r"message\s+(.*)", r"that\s+(.*)"]
            for pattern in split_patterns:
                m = re.search(pattern, clean_text, re.IGNORECASE)
                if m:
                    message = m.group(1).strip()
                    break

            if not message:
                # Text following the phone number
                after_phone = clean_text[phone_match.end():].strip()
                message = after_phone or "Transmission from JARVIS."
        else:
            # Check for contact name alias
            for contact_name, contact_phone in self.contacts.items():
                if contact_name in clean_text.lower():
                    recipient = contact_phone
                    m = re.search(r"saying\s+(.*)", clean_text, re.IGNORECASE)
                    if m:
                        message = m.group(1).strip()
                    else:
                        message = f"Hello, this is an automated dispatch from JARVIS for {contact_name.capitalize()}."
                    break

        if recipient:
            return recipient, message
        return None

    def send_whatsapp(self, phone_number: str, message: str) -> Tuple[bool, str]:
        """
        Dispatches WhatsApp message in background thread to prevent UI freezing.
        """
        def _worker():
            try:
                print(f"[COMMS] Initiating WhatsApp dispatch to {phone_number}...")
                pywhatkit.sendwhatmsg_instantly(
                    phone_no=phone_number,
                    message=message,
                    wait_time=15,
                    tab_close=True,
                    close_time=4
                )
                print(f"[COMMS] WhatsApp message delivered to {phone_number}.")
            except Exception as e:
                print(f"[COMMS] WhatsApp delivery failed: {e}")

        # Launch worker thread
        thread = threading.Thread(target=_worker, daemon=True)
        thread.start()

        return True, (
            f"Sir, transmitting WhatsApp dispatch to {phone_number}. "
            f"Browser automation sequence initiated."
        )
