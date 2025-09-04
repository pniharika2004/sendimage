import os
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from livekit import api
from dotenv import load_dotenv

load_dotenv()

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")

app = FastAPI()


class TokenRequest(BaseModel):
    room: str
    identity: str


@app.post("/token")
def create_token(req: TokenRequest):
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        return {"error": "API key/secret not configured"}

    at = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(req.identity)
        .with_grants(api.VideoGrants(room_join=True, room=req.room))
    )
    return {"token": at.to_jwt()}


@app.get("/", response_class=HTMLResponse)
def index():
    server_url = os.getenv("LIVEKIT_URL", "")
    html = """
<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>LiveKit Image Sender</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 12px; }
      label { display: grid; gap: 6px; margin: 10px 0; }
      input, button { padding: 8px 10px; font-size: 14px; }
      #status { margin-top: 8px; opacity: 0.8; }
      #preview { width: 240px; height: 240px; object-fit: cover; border-radius: 6px; display: none; }
    </style>
    <script src=\"https://unpkg.com/livekit-client/dist/livekit-client.umd.js\"></script>
  </head>
  <body>
    <h3>Send an image to LiveKit</h3>
    <label>
      <span>Server URL</span>
      <input id=\"serverUrl\" value=\"__SERVER_URL__\" placeholder=\"wss://your-livekit-host\" />
    </label>
    <label>
      <span>Room Name</span>
      <input id=\"roomName\" value=\"test-room\" />
    </label>
    <label>
      <span>Identity (any unique string)</span>
      <input id=\"identity\" placeholder=\"user-123\" />
    </label>
    <button id=\"btnConnect\">Connect</button>
    <div id=\"status\"></div>
    <hr />
    <input id=\"fileInput\" type=\"file\" accept=\"image/*\" disabled />
    <div id=\"progress\"></div>
    <div style=\"margin-top:12px;\">
      <img id=\"preview\" />
    </div>
    <script>
      const statusEl = document.getElementById('status');
      const setStatus = (t) => { statusEl.textContent = t; };
      let room;
      document.getElementById('btnConnect').onclick = async () => {
        try {
          const serverUrl = document.getElementById('serverUrl').value.trim();
          const roomName = document.getElementById('roomName').value.trim();
          const identity = document.getElementById('identity').value.trim() || ('user-' + Math.random().toString(36).slice(2));
          if (!serverUrl || !roomName) { alert('Enter server URL and room name'); return; }
          const resp = await fetch('/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room: roomName, identity }) });
          const data = await resp.json();
          if (!data.token) throw new Error('No token');
          room = new window.LivekitClient.Room();
          await room.connect(serverUrl, data.token);
          setStatus('Connected as ' + identity + ' to room ' + room.name);
          const fileInput = document.getElementById('fileInput');
          fileInput.disabled = false;
          room.registerByteStreamHandler('image-upload', async (reader, participantInfo) => {
            const chunks = [];
            for await (const chunk of reader) { chunks.push(chunk); }
            const blob = new Blob(chunks, { type: reader.info.mimeType || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const img = document.getElementById('preview');
            img.src = url; img.style.display = 'block';
          });
          fileInput.onchange = async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            try {
              const info = await room.localParticipant.sendFile(file, { topic: 'image-upload', mimeType: file.type, onProgress: (p) => { document.getElementById('progress').textContent = 'Uploading: ' + Math.round(((p||0)*100)) + '%'; } });
              setStatus('Sent file stream id: ' + info.id);
            } catch (err) { setStatus('Send error: ' + (err.message || err)); }
            finally { e.target.value = ''; }
          };
        } catch (err) { setStatus('Connect error: ' + (err.message || err)); }
      };
    </script>
  </body>
  </html>
"""
    return HTMLResponse(html.replace("__SERVER_URL__", server_url))


