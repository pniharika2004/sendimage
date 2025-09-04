import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRoomContext } from '@livekit/components-react'
import type { ByteStreamReader } from 'livekit-client/dist/src/room/data-stream/incoming/StreamReader'

const TOPIC = 'image-upload'

export function ImageShare() {
  const room = useRoomContext()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [sendingProgress, setSendingProgress] = useState<number | null>(null)
  const [receivedImages, setReceivedImages] = useState<Array<{ url: string; from: string; name: string }>>([])

  const canSend = useMemo(() => Boolean(room?.localParticipant), [room])

  const onPick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const onChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !room) return
    try {
      setSendingProgress(0)
      const info = await room.localParticipant.sendFile(file, {
        mimeType: file.type,
        topic: TOPIC,
        onProgress: (p) => setSendingProgress(p),
      })
      if (info?.id) {
        // show a local preview too
        const url = URL.createObjectURL(file)
        setReceivedImages((prev) => [{ url, from: 'me', name: file.name }, ...prev])
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('sendFile failed', err)
    } finally {
      setSendingProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [room])

  useEffect(() => {
    if (!room) return
    const handler = async (reader: ByteStreamReader, participantInfo: { identity: string }) => {
      try {
        const chunks: Uint8Array[] = []
        // Optional: track progress from receiver side
        reader.onProgress = () => {}
        for await (const chunk of reader) {
          chunks.push(chunk)
        }
        const mime = reader.info.mimeType || 'application/octet-stream'
        const blob = new Blob(chunks, { type: mime })
        const url = URL.createObjectURL(blob)
        const name = reader.info.name || 'file'
        setReceivedImages((prev) => [{ url, from: participantInfo.identity, name }, ...prev])
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('error receiving image', e)
      }
    }
    room.registerByteStreamHandler(TOPIC, handler)
    return () => {
      try {
        room.unregisterByteStreamHandler(TOPIC)
      } catch {}
    }
  }, [room])

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onChange}
        />
        <button disabled={!canSend} onClick={onPick}>
          {sendingProgress == null ? 'Upload Image' : `Uploading ${Math.round(sendingProgress * 100)}%`}
        </button>
        <span style={{ opacity: 0.8 }}>Topic: {TOPIC}</span>
      </div>
      {receivedImages.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <h3>Images</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {receivedImages.map((img, idx) => (
              <figure key={idx} style={{ margin: 0 }}>
                <img src={img.url} alt={img.name} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 6 }} />
                <figcaption style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  {img.name} — from {img.from}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


