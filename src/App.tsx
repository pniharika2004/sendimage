import { useCallback, useMemo, useState } from 'react'
import './App.css'
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react'
import { ImageShare } from './components/ImageShare'

function ConnectForm({ onConnect }: { onConnect: (url: string, token: string) => void }) {
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')

  const canConnect = useMemo(() => url.trim().length > 0 && token.trim().length > 0, [url, token])

  return (
    <div style={{ maxWidth: 680, margin: '40px auto', padding: 16 }}>
      <h2>LiveKit Voice Agent</h2>
      <p style={{ opacity: 0.8, lineHeight: 1.4 }}>
        Enter your LiveKit server URL and an access token to connect. Once connected, you can send an image to the agent.
      </p>
      <div style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Server URL</span>
          <input
            placeholder="wss://your-livekit-host"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ padding: '8px 10px' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Access Token</span>
          <textarea
            placeholder="Paste your LiveKit access token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={5}
            style={{ padding: '8px 10px', resize: 'vertical' }}
          />
        </label>
        <button disabled={!canConnect} onClick={() => onConnect(url.trim(), token.trim())}>
          Connect
        </button>
      </div>
      <details style={{ marginTop: 16 }}>
        <summary>How do I get a token?</summary>
        <div style={{ opacity: 0.8, marginTop: 8 }}>
          Generate a participant token from your server or LiveKit Cloud for this room. Ensure the token has permissions to publish/subscribe audio and data.
        </div>
      </details>
    </div>
  )
}

function StartAudioButton() {
  const room = useRoomContext()
  const onClick = useCallback(() => {
    room?.startAudio().catch(() => {})
  }, [room])
  return (
    <button onClick={onClick} style={{ marginBottom: 12 }}>
      Unmute Page Audio
    </button>
  )
}

function App() {
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [connect, setConnect] = useState(false)

  const handleConnect = useCallback((url: string, tk: string) => {
    setServerUrl(url)
    setToken(tk)
    setConnect(true)
  }, [])

  if (!connect || !serverUrl || !token) {
    return <ConnectForm onConnect={handleConnect} />
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={false}
      data={true}
      style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2>Connected</h2>
        <StartAudioButton />
        <ImageShare />
        <RoomAudioRenderer />
      </div>
    </LiveKitRoom>
  )
}

export default App
