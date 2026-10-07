import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import QRCode from "qrcode"
import Join from "./join"
import "./index.css"
import "./App.css"

const SERVER_URL = (
  import.meta.env.VITE_SERVER_URL || "http://localhost:3000"
).replace(/\/+$/, "")

const SLIP_COLORS = [
  "#ffb36b",
  "#8ed1fc",
  "#c9a7ff",
  "#ff8fa3",
  "#a8ecb4",
  "#ffe66d",
]

function hash(text) {
  let value = 0
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) >>> 0
  }
  return value
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

function Slip({ message, latest }) {
  const seed = hash(message.id)
  const style = {
    "--tilt": `${((seed % 7) - 3) * 0.8}deg`,
    "--slip": SLIP_COLORS[seed % SLIP_COLORS.length],
  }

  const className = [
    "slip",
    message.fresh ? "is-fresh" : "",
    latest ? "is-latest" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <li className={className} style={style}>
      <p>{message.text}</p>
      <time dateTime={new Date(message.at).toISOString()}>
        {formatTime(message.at)}
      </time>
    </li>
  )
}

function Dashboard() {
  const [qrCode, setQrCode] = useState("")
  const [messages, setMessages] = useState([])
  const [phones, setPhones] = useState(0)
  const [connected, setConnected] = useState(false)

  const joinUrl = `${window.location.origin}/join`
  const isLocal = ["localhost", "127.0.0.1"].includes(
    window.location.hostname
  )

  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      width: 640,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1e1b3a", light: "#ffffff" },
    })
      .then(setQrCode)
      .catch((error) => {
        console.error("QR generation failed:", error)
      })
  }, [joinUrl])

  useEffect(() => {
    const socket = io(SERVER_URL, { auth: { role: "dashboard" } })

    socket.on("connect", () => setConnected(true))
    socket.on("disconnect", () => setConnected(false))

    // Newest first.
    socket.on("history", (items) => {
      setMessages([...items].reverse())
    })

    socket.on("new-message", (message) => {
      setMessages((previous) =>
        previous.some((item) => item.id === message.id)
          ? previous
          : [{ ...message, fresh: true }, ...previous]
      )
    })

    socket.on("stats", (stats) => setPhones(stats.phones))

    return () => {
      socket.disconnect()
    }
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen?.()
    }
  }

  return (
    <div className="stage">
      <aside className="side">
        <div className="brand-row">
          <span className="brand">Live Interaction</span>
          <span className={`status${connected ? " is-live" : ""}`}>
            <span className="status-dot" />
            {connected ? "Live" : "Connecting"}
          </span>
        </div>

        <div className="headline">
          <h1>Drop a note.</h1>
          <p>Scan, type, send. No name, no sign-up.</p>
        </div>

        <div className="qr-tile">
          {qrCode && <img src={qrCode} alt="QR code to join" />}
        </div>

        <div>
          <p className="join-link">
            {joinUrl.replace(/^https?:\/\//, "")}
          </p>
          <p className="join-hint">Point your phone camera at the code.</p>
        </div>

        {isLocal && (
          <p className="local-note">
            You are on localhost, so phones cannot open this code. Open
            the deployed link instead.
          </p>
        )}

        <div className="stats">
          <div className="stat">
            <strong>{messages.length}</strong>
            <span>{messages.length === 1 ? "note" : "notes"} on the wall</span>
          </div>
          <div className="stat">
            <strong>{phones}</strong>
            <span>{phones === 1 ? "phone" : "phones"} connected</span>
          </div>
        </div>
      </aside>

      <main className="wall">
        <div className="wall-head">
          <h2>Notes from the room</h2>
          <button className="ghost-btn" onClick={toggleFullscreen}>
            Full screen
          </button>
        </div>

        <div className="wall-scroll">
          {messages.length === 0 ? (
            <div className="empty">
              <div className="empty-slip">
                <h3>The wall is empty</h3>
                <p>Scan the code and post the first note.</p>
              </div>
            </div>
          ) : (
            <ul className="notes">
              {messages.map((message, index) => (
                <Slip
                  key={message.id}
                  message={message}
                  latest={index === 0}
                />
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}

function App() {
  const path = window.location.pathname.replace(/\/+$/, "")

  if (path === "/join") {
    return <Join />
  }

  return <Dashboard />
}

export default App