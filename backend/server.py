import sys
from pathlib import Path

# Add project root to sys.path so 'backend' package is always resolvable
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import asyncio
import json
import datetime
import traceback
import websockets
from backend.config import SERVER_HOST, SERVER_PORT
from backend.jarvis_core import JarvisCore
from backend.supabase_db import supabase_db

connected_clients = set()
loop: asyncio.AbstractEventLoop = None
jarvis: JarvisCore = None

def broadcast_message(message_dict: dict):
    """Safely broadcasts a message dict to all connected WebSockets from any thread."""
    if not connected_clients or not loop or loop.is_closed():
        return
    payload = json.dumps(message_dict)
    for ws in list(connected_clients):
        try:
            asyncio.run_coroutine_threadsafe(_send(ws, payload), loop)
        except Exception:
            pass

async def _send(ws, payload: str):
    try:
        await ws.send(payload)
    except Exception:
        pass

def on_state_change(state: str):
    broadcast_message({
        "type": "state",
        "state": state,
        "timestamp": datetime.datetime.now().strftime("%H:%M:%S")
    })

def on_terminal_log(tag: str, message: str, level: str):
    broadcast_message({
        "type": "log",
        "tag": tag,
        "message": message,
        "level": level,
        "timestamp": datetime.datetime.now().strftime("%H:%M:%S")
    })

def on_speak(text: str):
    broadcast_message({
        "type": "speak",
        "text": text,
        "timestamp": datetime.datetime.now().strftime("%H:%M:%S")
    })

async def telemetry_broadcast_loop():
    """Periodically broadcast hardware telemetry every 2 seconds."""
    while True:
        try:
            await asyncio.sleep(2.0)
            if connected_clients and jarvis:
                telemetry = jarvis.get_telemetry_data()
                broadcast_message({
                    "type": "telemetry",
                    "data": telemetry
                })
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[SERVER] Telemetry error: {e}")

async def supabase_directive_worker():
    """
    Polls Supabase for PENDING directives submitted from web HUD or cloud devices
    and executes them locally on the user's PC.
    """
    print("[SUPABASE_WORKER] Cloud directive synchronization listener online.")
    while True:
        try:
            await asyncio.sleep(1.0)
            if jarvis and supabase_db and supabase_db._is_connected and supabase_db.client:
                # Query oldest pending directive
                res = supabase_db.client.table("jarvis_directives").select("*").eq("status", "PENDING").order("created_at", desc=False).limit(3).execute()
                pending_list = res.data or []

                for item in pending_list:
                    item_id = item.get("id")
                    cmd = item.get("command", "").strip()
                    if cmd and item_id:
                        # Mark as PROCESSING
                        supabase_db.client.table("jarvis_directives").update({"status": "PROCESSING"}).eq("id", item_id).execute()
                        print(f"[SUPABASE_WORKER] Executing cloud directive: '{cmd}'")
                        on_terminal_log("CLOUD.EXEC", f"Processing cloud directive: '{cmd}'", "ACTION")

                        # Process query in worker thread to prevent event loop freeze
                        response = await asyncio.get_running_loop().run_in_executor(None, jarvis.process_query, cmd)

                        # Mark as COMPLETED with execution result
                        supabase_db.client.table("jarvis_directives").update({
                            "status": "COMPLETED",
                            "result": response
                        }).eq("id", item_id).execute()

                        print(f"[SUPABASE_WORKER] Directive completed: {response[:80]}")
                        on_terminal_log("CLOUD.EXEC", f"Executed: {response}", "SUCCESS")
        except asyncio.CancelledError:
            break
        except Exception as e:
            await asyncio.sleep(2.0)

async def handle_client(websocket):
    global connected_clients
    connected_clients.add(websocket)
    client_addr = getattr(websocket, "remote_address", "client")
    print(f"[SERVER] HUD Client connected from {client_addr}")

    # Send initial hand-shake
    initial_payload = {
        "type": "handshake",
        "system": "JARVIS Mark VII",
        "state": jarvis.current_state if jarvis else "IDLE",
        "telemetry": jarvis.get_telemetry_data() if jarvis else {},
        "timestamp": datetime.datetime.now().strftime("%H:%M:%S")
    }
    await websocket.send(json.dumps(initial_payload))

    try:
        async for raw_msg in websocket:
            try:
                data = json.loads(raw_msg)
                action = data.get("action", "")

                if action == "query":
                    text = data.get("text", "").strip()
                    if text and jarvis:
                        asyncio.get_running_loop().run_in_executor(None, jarvis.process_query, text)

                elif action == "listen":
                    if jarvis:
                        asyncio.get_running_loop().run_in_executor(None, jarvis.listen_and_process)

                elif action == "speak":
                    text = data.get("text", "").strip()
                    if text and jarvis:
                        jarvis.voice_out.speak(text)

                elif action == "stop":
                    if jarvis:
                        jarvis.voice_out.clear()
                        jarvis._set_state("IDLE")
                        on_terminal_log("SYS", "Directives halted. Systems on standby.", "INFO")

                elif action == "ping":
                    await websocket.send(json.dumps({"type": "pong"}))

            except Exception as e:
                print(f"[SERVER] Error handling client message: {e}")
                traceback.print_exc()

    except (websockets.exceptions.ConnectionClosed, Exception):
        pass
    finally:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
        print(f"[SERVER] HUD Client disconnected from {client_addr}")

async def main():
    global loop, jarvis
    loop = asyncio.get_running_loop()

    print("[SERVER] Initializing JARVIS Core Engine...")
    jarvis = JarvisCore(
        on_state_change=on_state_change,
        on_terminal_log=on_terminal_log,
        on_speak=on_speak
    )

    host = "0.0.0.0"
    port = SERVER_PORT

    print(f"[SERVER] Starting WebSocket service on ws://127.0.0.1:{port}")
    async with websockets.serve(handle_client, host, port):
        # Background tasks
        telemetry_task = asyncio.create_task(telemetry_broadcast_loop())
        directive_task = asyncio.create_task(supabase_directive_worker())
        print(f"[SERVER] JARVIS WebSocket Server is LIVE and listening on ws://127.0.0.1:{port}")
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[SERVER] Powering down JARVIS Mark VII Core...")
