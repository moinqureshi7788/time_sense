import express from 'express'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import xml2js from 'xml2js'
import unzipper from 'unzipper'
import Groq from 'groq-sdk'
import prisma from '../prisma/client.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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

// ── Extract XML from zip buffer ─────────────────────────────
const extractXMLFromZip = (buffer) => {
  return new Promise((resolve, reject) => {
    const chunks = []
    const stream = unzipper.Parse()

    stream.on('entry', (entry) => {
      const fileName = entry.path
      if (fileName.endsWith('.xml')) {
        const xmlChunks = []
        entry.on('data', (chunk) => xmlChunks.push(chunk))
        entry.on('end', () => resolve(Buffer.concat(xmlChunks).toString()))
      } else {
        entry.autodrain()
      }
    })

    stream.on('error', reject)
    stream.on('finish', () => resolve(null))

    const { Readable } = require('stream')
    Readable.from(buffer).pipe(stream)
  })
}

// ── Parse health XML ────────────────────────────────────────
const parseHealthXML = async (xmlString) => {
  const parser = new xml2js.Parser({ explicitArray: true })
  const result = await parser.parseStringPromise(xmlString)
  const records = result?.HealthData?.Record || []

  const sleep = records
    .filter(r => r.$.type?.includes('SleepAnalysis'))
    .slice(0, 20)
    .map(r => ({
      type: r.$.type,
      value: r.$.value,
      startDate: r.$.startDate,
      endDate: r.$.endDate
    }))

  const steps = records
    .filter(r => r.$.type?.includes('StepCount'))
    .slice(0, 20)
    .map(r => ({
      value: r.$.value,
      startDate: r.$.startDate,
      endDate: r.$.endDate
    }))

  const heartRate = records
    .filter(r => r.$.type?.includes('HeartRate'))
    .slice(0, 20)
    .map(r => ({
      value: r.$.value,
      startDate: r.$.startDate,
      endDate: r.$.endDate
    }))

  const activity = records
    .filter(r => r.$.type?.includes('ActiveEnergyBurned'))
    .slice(0, 20)
    .map(r => ({
      value: r.$.value,
      startDate: r.$.startDate,
      endDate: r.$.endDate
    }))

  return { sleep, steps, heartRate, activity }
}

// ── Step 1: Read Screen Time Screenshot ────────────────────
router.post('/read-screenshot', verifyToken, upload.array('screenshots', 10), async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: 'No screenshots provided' })
    }

    const imageContents = req.files.map(file => ({
      type: 'image_url',
      image_url: {
        url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
      }
    }))

    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            ...imageContents,
            {
              type: 'text',
              text: `These are iPhone Screen Time screenshots showing WEEKLY data (notice "This Week" label).

Key facts about this Screen Time format:
- The big number at the top (e.g. "16h 36m") is the DAILY AVERAGE across ALL apps combined
- The numbers next to each app (e.g. Chrome: 13h 36m) are WEEKLY TOTALS for that app
- Times like "21m", "19m", "7m" are weekly totals in minutes
- Times like "13h 36m", "5h 8m" are weekly totals in hours and minutes
- Total Screen Time shown (e.g. "33h 13m") is the WEEKLY total across all apps

Extract all apps visible across all screenshots.

Return ONLY this JSON, no explanation, no markdown:
{
  "totalDailyAverage": "16h 36m",
  "totalWeeklyScreenTime": "33h 13m",
  "apps": [
    {"name": "Chrome", "weeklyTotal": "13h 36m", "category": "Productivity"},
    {"name": "Safari", "weeklyTotal": "5h 8m", "category": "Productivity"},
    {"name": "Reddit", "weeklyTotal": "2h 46m", "category": "Social"},
    {"name": "YouTube", "weeklyTotal": "1h 11m", "category": "Entertainment"},
    {"name": "WhatsApp", "weeklyTotal": "7m", "category": "Social"}
  ],
  "mostUsedTimes": "afternoon and evening",
  "pickups": 80,
  "notifications": 120
}`
            }
          ]
        }
      ]
    })

    let content = response.choices[0].message.content.trim()
    content = content.replace(/```json/g, '').replace(/```/g, '').trim()
    const screenTimeData = JSON.parse(content)
    res.json({ screenTimeData })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to read screenshot' })
  }
})

// ── Step 2: Full Analysis ───────────────────────────────────
router.post('/analyze', verifyToken, upload.single('healthZip'), async (req, res) => {
  try {
    const { screenTimeData } = req.body
    let healthSummary = 'No health data provided.'

    if (req.file) {
      try {
        const xmlString = await extractXMLFromZip(req.file.buffer)
        if (xmlString) {
          const healthData = await parseHealthXML(xmlString)
          healthSummary = `
Sleep records: ${healthData.sleep.length} found
Sample sleep: ${JSON.stringify(healthData.sleep.slice(0, 3))}

Step records: ${healthData.steps.length} found
Sample steps: ${JSON.stringify(healthData.steps.slice(0, 3))}

Heart rate records: ${healthData.heartRate.length} found
Sample heart rate: ${JSON.stringify(healthData.heartRate.slice(0, 3))}

Active energy records: ${healthData.activity.length} found
Sample activity: ${JSON.stringify(healthData.activity.slice(0, 3))}
          `
        }
      } catch (xmlError) {
        console.error('XML parsing error:', xmlError)
        healthSummary = 'Health data could not be parsed.'
      }
    }

    const prompt = `You are a behavioral analyst and productivity expert. Analyze the following user data and generate a detailed personalized insights report.

SCREEN TIME DATA (extracted from iPhone screenshot):
${screenTimeData}

HEALTH DATA FROM IPHONE:
${healthSummary}

Based on this data, generate a JSON response with exactly this structure:
{
  "energyCurve": [
    {"hour": "6 AM", "energy": <number 0-100 based on data>, "label": "<label>"},
    ... continue for each hour until 10 PM
  ],
  "focusWindows": [
    {"time": "<time range>", "type": "<peak|good>", "label": "<label>", "description": "<why, based on their actual app usage>"}
  ],
  "procrastinationWindows": [
    {"time": "<time range>", "type": "<high|medium>", "label": "<label>", "description": "<why, referencing their actual apps>"}
  ],
  "sleepScore": <0-100>,
  "sleepInsight": "<personalized to their actual sleep data>",
  "appInsights": [
    {"app": "<actual app from their data>", "weeklyHours": <number>, "pattern": "<observed pattern>", "impact": "<positive|neutral|negative>"}
  ],
  "taskRecommendations": [
    {"taskType": "<type>", "bestTime": "<time>", "reason": "<reason tied to their specific data>"}
  ],
  "personalityInsight": "<specific to their actual usage patterns>",
  "weeklyScreenTime": <number from their data>,
  "procrastinationApps": ["<actual apps from their data>"]
}

Respond with ONLY the JSON, no explanation, no markdown backticks.`

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    })

    let content = response.choices[0].message.content.trim()
    content = content.replace(/```json/g, '').replace(/```/g, '').trim()
    const insights = JSON.parse(content)
    res.json(insights)

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Analysis failed' })
  }
})

// ── Classify browser history titles with AI ─────────────────
router.post('/classify-history', verifyToken, async (req, res) => {
  try {
    const { sites } = req.body

    if (!sites || sites.length === 0) {
      return res.json({ categories: [] })
    }

    const siteList = sites
      .map((s, i) => `${i + 1}. Domain: "${s.domain}" | Title: "${s.title}"`)
      .join('\n')

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a browser history classifier. Classify each site into exactly one of these categories:
- work (coding, productivity tools, professional tasks)
- learning (tutorials, courses, educational content, documentation)
- entertainment (videos, music, games, memes — non-educational YouTube)
- social (social media, messaging)
- shopping (ecommerce, food delivery)
- news (news articles, blogs)
- other (anything else)

Be smart about context. A YouTube page with a tutorial title = learning. A YouTube page with a music/funny video title = entertainment. GitHub = work. Wikipedia = learning.

Respond with ONLY a JSON array, no explanation, no markdown:
[{"domain":"youtube.com","category":"learning"},{"domain":"reddit.com","category":"entertainment"}]`
        },
        {
          role: 'user',
          content: `Classify these browser history entries:\n${siteList}\n\nReturn ONLY the JSON array.`
        }
      ]
    })

    let content = response.choices[0].message.content.trim()
    content = content.replace(/```json/g, '').replace(/```/g, '').trim()
    const categories = JSON.parse(content)
    res.json({ categories })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Classification failed' })
  }
})

// ── Receive Chrome history from extension ───────────────────
router.post('/chrome-history', verifyToken, async (req, res) => {
  try {
    const { period, totalVisits, estimatedMinutes, productiveRatio, categoryTotals, topSites } = req.body

    if (!totalVisits) {
      return res.status(400).json({ message: 'No data provided' })
    }

    await prisma.chromeHistory.create({
      data: {
        userId: req.user.id,
        period: period || 'today',
        totalVisits,
        estimatedMinutes,
        productiveRatio,
        categoryTotals,
        topSites,
      }
    })

    res.json({ message: 'Chrome history synced successfully' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to save chrome history' })
  }
})

export default router