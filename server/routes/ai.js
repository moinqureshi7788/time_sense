import express from 'express'
import jwt from 'jsonwebtoken'
import Groq from 'groq-sdk'
import prisma from '../prisma/client.js'

const router = express.Router()

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

// ── Middleware: Verify Token ────────────────────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Access denied.' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ message: 'Invalid token.' })
  }
}

// ── Daily Planner ───────────────────────────────────────────
router.post('/planner', verifyToken, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id, done: false }
    })

    if (tasks.length === 0) {
      return res.json({ suggestion: "You have no pending tasks. Enjoy your day or add some new goals! 🎉" })
    }

    const taskList = tasks.map(t => `- ${t.title}`).join('\n')

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a productivity assistant. Be concise, friendly and practical. Keep responses under 100 words.'
        },
        {
          role: 'user',
          content: `Here are my pending tasks:\n${taskList}\n\nSuggest which 2-3 tasks I should focus on today and why. Be brief.`
        }
      ]
    })

    const suggestion = response.choices[0].message.content
    res.json({ suggestion })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'AI request failed' })
  }
})

// ── Note Summarizer ─────────────────────────────────────────
router.post('/summarize', verifyToken, async (req, res) => {
  try {
    const { noteId } = req.body

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId: req.user.id }
    })

    if (!note) return res.status(404).json({ message: 'Note not found' })

    if (!note.body || note.body.length < 50) {
      return res.json({ summary: 'Note is too short to summarize.' })
    }

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes notes into 3 concise bullet points.'
        },
        {
          role: 'user',
          content: `Summarize this note in 3 bullet points:\n\nTitle: ${note.title}\n\n${note.body}`
        }
      ]
    })

    const summary = response.choices[0].message.content
    res.json({ summary })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'AI request failed' })
  }
})

// ── AI Chat Assistant ───────────────────────────────────────
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { message } = req.body

    if (!message || !Array.isArray(message)) {
      return res.status(400).json({ message: 'Message is required' })
    }

    // Fetch user's real data
    const [tasks, notes] = await Promise.all([
      prisma.task.findMany({ where: { userId: req.user.id } }),
      prisma.note.findMany({ where: { userId: req.user.id }, take: 5, orderBy: { createdAt: 'desc' } })
    ])

    const pendingTasks = tasks.filter(t => !t.done).map(t => t.title)
    const completedTasks = tasks.filter(t => t.done).map(t => t.title)
    const recentNotes = notes.map(n => n.title)

    const systemPrompt = `You are TimeSense AI, a personalized productivity assistant. You have access to the user's real data:

PENDING TASKS (${pendingTasks.length}): ${pendingTasks.length > 0 ? pendingTasks.join(', ') : 'None'}
COMPLETED TASKS (${completedTasks.length}): ${completedTasks.length > 0 ? completedTasks.join(', ') : 'None'}
RECENT NOTES: ${recentNotes.length > 0 ? recentNotes.join(', ') : 'None'}

Use this data to give personalized, specific advice. Reference their actual tasks and notes when relevant. Keep responses under 150 words. Be friendly and practical.`

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...message
      ]
    })

    const reply = response.choices[0].message.content
    res.json({ reply })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'AI request failed' })
  }
})

// ── AI Time Planner ─────────────────────────────────────────
router.post('/timeplan', verifyToken, async (req, res) => {
  try {
    const { startTime, endTime } = req.body

    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id, done: false }
    })

    if (tasks.length === 0) {
      return res.json({ schedule: [] })
    }

    const taskList = tasks.map(t => `- ${t.title}`).join('\n')

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a productivity assistant that creates time schedules. 
You must respond with ONLY a valid JSON array, no explanation, no markdown, no extra text.
Each item must have: "time" (format: "9:00 AM"), "duration" (e.g. "30 min"), "task" (task name), "type" (one of: work, break, personal).`
        },
        {
          role: 'user',
          content: `Create a time schedule for today from ${startTime} to ${endTime}.
Include short breaks between tasks.
Tasks to schedule:
${taskList}

Respond with ONLY a JSON array like this:
[{"time":"9:00 AM","duration":"45 min","task":"Task name","type":"work"},{"time":"9:45 AM","duration":"15 min","task":"Short break","type":"break"}]`
        }
      ]
    })

    let content = response.choices[0].message.content.trim()

    // Strip markdown code blocks if present
    content = content.replace(/```json/g, '').replace(/```/g, '').trim()

    const schedule = JSON.parse(content)
    res.json({ schedule })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'AI request failed' })
  }
})

export default router