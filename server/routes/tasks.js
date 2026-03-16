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

// ── Get all tasks ───────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    })
    res.json(tasks)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

// ── Create a task ───────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title } = req.body

    if (!title) {
      return res.status(400).json({ message: 'Title is required' })
    }

    const task = await prisma.task.create({
      data: {
        title,
        userId: req.user.id
      }
    })

    res.status(201).json(task)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

// ── Toggle task done ────────────────────────────────────────
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const task = await prisma.task.findFirst({
      where: {
        id: Number(req.params.id),
        userId: req.user.id
      }
    })

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { done: !task.done }
    })

    res.json(updated)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

// ── Delete a task ───────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const task = await prisma.task.findFirst({
      where: {
        id: Number(req.params.id),
        userId: req.user.id
      }
    })

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    await prisma.task.delete({
      where: { id: task.id }
    })

    res.json({ message: 'Task deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router