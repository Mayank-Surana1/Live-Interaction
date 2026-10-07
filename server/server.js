const express = require("express")
const http = require("http")
const cors = require("cors")
const crypto = require("crypto")
const { Server } = require("socket.io")

const MAX_LENGTH = 280
const MAX_HISTORY = 200
const COOLDOWN_MS = 1500

const app = express()
const server = http.createServer(app)

app.use(cors())
app.use(express.json())

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

// Oldest first. Kept in memory, so it resets when the server restarts.
const history = []
let phones = 0

function sendStats() {
  io.to("dashboards").emit("stats", { phones })
}

io.on("connection", (socket) => {
  const isDashboard = socket.handshake.auth?.role === "dashboard"
  let lastSentAt = 0

  if (isDashboard) {
    socket.join("dashboards")
    socket.emit("history", history)
    socket.emit("stats", { phones })
  } else {
    phones += 1
    sendStats()
  }

  socket.on("send-message", (text, ack) => {
    const reply = typeof ack === "function" ? ack : () => {}

    if (typeof text !== "string") {
      return reply({ ok: false, error: "Write something first." })
    }

    const clean = text.trim().slice(0, MAX_LENGTH)

    if (!clean) {
      return reply({ ok: false, error: "Write something first." })
    }

    const now = Date.now()
    if (now - lastSentAt < COOLDOWN_MS) {
      return reply({
        ok: false,
        error: "Wait a moment before sending another note.",
      })
    }
    lastSentAt = now

    const message = {
      id: crypto.randomUUID(),
      text: clean,
      at: now,
    }

    history.push(message)
    if (history.length > MAX_HISTORY) {
      history.shift()
    }

    io.to("dashboards").emit("new-message", message)
    reply({ ok: true })
  })

  socket.on("disconnect", () => {
    if (!isDashboard) {
      phones = Math.max(0, phones - 1)
      sendStats()
    }
  })
})

app.get("/", (req, res) => {
  res.send("Live Interaction Server is running")
})

const PORT = process.env.PORT || 3000

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Live Interaction Server running on port ${PORT}`)
})