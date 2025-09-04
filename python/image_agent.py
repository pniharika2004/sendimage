import os
import asyncio
import pathlib
import time
from typing import Optional

from livekit import rtc
from dotenv import load_dotenv

load_dotenv()

LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_TOKEN = os.getenv("LIVEKIT_TOKEN", "")

TOPIC = "image-upload"


def ext_from_mime(mime: Optional[str]) -> str:
    if not mime:
        return ".bin"
    m = mime.lower()
    if "jpeg" in m or "jpg" in m:
        return ".jpg"
    if "png" in m:
        return ".png"
    if "webp" in m:
        return ".webp"
    if "gif" in m:
        return ".gif"
    return ".bin"


async def main() -> None:
    if not LIVEKIT_URL or not LIVEKIT_TOKEN:
        raise RuntimeError("Set LIVEKIT_URL and LIVEKIT_TOKEN in environment.")

    room = rtc.Room()

    def on_connected():
        print("Connected to room:", room.name)

    def on_data_received(data: rtc.DataPacket):
        if data.topic != TOPIC:
            return
        
        print(f"Receiving data from {data.participant.identity if data.participant else 'unknown'} (topic={data.topic})")
        
        # Save the received data
        received_dir = pathlib.Path("received")
        received_dir.mkdir(exist_ok=True)
        fname = f"{int(time.time())}-{data.participant.identity if data.participant else 'unknown'}-data.bin"
        path = received_dir / fname

        with open(path, "wb") as f:
            f.write(data.payload)

        print(f"Saved data to {path}")

    room.on("connected", on_connected)
    room.on("data_received", on_data_received)

    try:
        print(f"Connecting to {LIVEKIT_URL}...")
        await room.connect(LIVEKIT_URL, LIVEKIT_TOKEN)
        print("Connected successfully! Waiting for data...")
        await asyncio.Event().wait()
    except Exception as e:
        print(f"Connection error: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())


