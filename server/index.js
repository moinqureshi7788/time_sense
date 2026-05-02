import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import taskRoutes from './routes/tasks.js'
import noteRoutes from './routes/notes.js'
import aiRoutes from './routes/ai.js'
import insightsRoutes from './routes/insights.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8000

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://time-sense-five.vercel.app',
      'http://localhost:5173'
    ]
    // Allow Chrome extensions and requests with no origin (Postman etc.)
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/notes', noteRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/insights', insightsRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'TimeSense API is running! 🚀' })
})

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`)
})