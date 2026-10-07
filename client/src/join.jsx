import { useEffect, useRef, useState } from "react"
import { io } from "socket.io-client"

const SERVER_URL = (
  import.meta.env.VITE_SERVER_URL || "http://localhost:3000"
).replace(/\/+$/, "")

const MAX_LENGTH = 280

function Join() {
  const socketRef = useRef(null)
  const [text, setText] = useState("")
  const [connected, setConnected] = useState(false)
  const [slow, setSlow] = useState(false)
  const [sending, setSending] = useState(false)
  const [phase, setPhase] = useState("writing") // writing | tossing | sent
  const [error, setError] = useState("")

  useEffect(() => {
    const socket = io(SERVER_URL, { auth: { role: "phone" } })
    socketRef.current = socket

    socket.on("connect", () => setConnected(true))
    socket.on("disconnect", () => setConnected(false))

    const timer = setTimeout(() => setSlow(true), 2500)

    return () => {
      clearTimeout(timer)
      socket.disconnect()
    }
  }, [])

  const send = () => {
    const note = text.trim()

    if (!note || sending || !connected) {
      return
    }

    setSending(true)
    setError("")

    socketRef.current
      .timeout(8000)
      .emit("send-message", note, (err, response) => {
        setSending(false)

        if (err || !response?.ok) {
          setError(
            response?.error ||
              "Could not send. Check your connection and try again."
          )
          return
        }

        setPhase("tossing")

        setTimeout(() => {
          setText("")
          setPhase("sent")
        }, 650)
      })
  }

  if (phase === "sent") {
    return (
      <main className="join">
        <div className="join-inner">
          <div className="done">
            <svg
              className="done-check"
              viewBox="0 0 64 64"
              aria-hidden="true"
            >
              <circle cx="32" cy="32" r="30" fill="#7ee8b0" />
              <path
                d="M19 33l9 9 17-19"
                fill="none"
                stroke="#1e1b3a"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1>Note sent.</h1>
            <p className="join-lede">It is on the big screen now.</p>
          </div>

          <div className="join-actions">
            <button className="send alt" onClick={() => setPhase("writing")}>
              Write another note
            </button>
          </div>
        </div>
      </main>
    )
  }

  const tossing = phase === "tossing"
  const empty = !text.trim()

  let buttonLabel = "Send note"
  if (!connected) buttonLabel = "Connecting"
  else if (sending) buttonLabel = "Sending"

  return (
    <main className="join">
      <div className="join-inner">
        <span className="join-brand">Live Interaction</span>

        <div>
          <h1>Write a note.</h1>
          <p className="join-lede">
            No name, no sign-up. Your note goes straight to the screen.
          </p>
        </div>

        {!connected && slow && (
          <p className="notice">
            Waking up the server. This can take up to a minute.
          </p>
        )}

        {error && <p className="notice is-error">{error}</p>}

        <div className={`note${tossing ? " is-tossed" : ""}`}>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Say what is on your mind..."
            maxLength={MAX_LENGTH}
            disabled={tossing}
            aria-label="Your note"
            rows={6}
          />
          <div className="note-foot">
            {MAX_LENGTH - text.length} left
          </div>
        </div>

        <div className="join-actions">
          <button
            className="send"
            onClick={send}
            disabled={empty || sending || !connected || tossing}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </main>
  )
}

export default Join