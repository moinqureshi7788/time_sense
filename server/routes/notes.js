import express from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../prisma/client.js'

const router = express.Router()

// ── Middleware: Verify Token ────────────────────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' })
  }
}

// ── Get all notes ───────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const notes = await prisma.note.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    })
    res.json(notes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

// ── Create a note ───────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, body } = req.body

    if (!title) {
      return res.status(400).json({ message: 'Title is required' })
    }

    const note = await prisma.note.create({
      data: {
        title,
        body: body || '',
        userId: req.user.id
      }
    })

    res.status(201).json(note)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

// ── Delete a note ───────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const note = await prisma.note.findFirst({
      where: {
        id: Number(req.params.id),
        userId: req.user.id
      }
    })

    if (!note) {
      return res.status(404).json({ message: 'Note not found' })
    }

    await prisma.note.delete({
      where: { id: note.id }
    })

    res.json({ message: 'Note deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

// ── Update a note ───────────────────────────────────────────
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const note = await prisma.note.findFirst({
      where: {
        id: Number(req.params.id),
        userId: req.user.id
      }
    })

    if (!note) {
      return res.status(404).json({ message: 'Note not found' })
    }

    const { title, body } = req.body

    const updated = await prisma.note.update({
      where: { id: note.id },
      data: {
        title: title || note.title,
        body: body || note.body
      }
    })

    res.json(updated)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router