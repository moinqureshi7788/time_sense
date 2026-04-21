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
  origin: process.env.NODE_ENV === 'production'
    ? 'https://time-sense-five.vercel.app'
    : 'http://localhost:5173',
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