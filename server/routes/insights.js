import express from 'express'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import xml2js from 'xml2js'
import unzipper from 'unzipper'
import Groq from 'groq-sdk'

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
    {"hour": "6 AM", "energy": 60, "label": "Waking up"},
    {"hour": "7 AM", "energy": 70, "label": "Morning routine"},
    {"hour": "8 AM", "energy": 85, "label": "Peak focus"},
    {"hour": "9 AM", "energy": 90, "label": "Deep work"},
    {"hour": "10 AM", "energy": 88, "label": "High focus"},
    {"hour": "11 AM", "energy": 80, "label": "Good focus"},
    {"hour": "12 PM", "energy": 60, "label": "Lunch time"},
    {"hour": "1 PM", "energy": 50, "label": "Post lunch dip"},
    {"hour": "2 PM", "energy": 55, "label": "Recovery"},
    {"hour": "3 PM", "energy": 65, "label": "Afternoon focus"},
    {"hour": "4 PM", "energy": 70, "label": "Second wind"},
    {"hour": "5 PM", "energy": 65, "label": "Winding down"},
    {"hour": "6 PM", "energy": 55, "label": "Evening"},
    {"hour": "7 PM", "energy": 45, "label": "Dinner time"},
    {"hour": "8 PM", "energy": 40, "label": "Relaxation"},
    {"hour": "9 PM", "energy": 30, "label": "Wind down"},
    {"hour": "10 PM", "energy": 20, "label": "Sleep prep"}
  ],
  "focusWindows": [
    {"time": "9:00 AM - 11:00 AM", "type": "peak", "label": "Peak Focus", "description": "Your best time for deep work"},
    {"time": "3:00 PM - 5:00 PM", "type": "good", "label": "Good Focus", "description": "Second wind for focused tasks"}
  ],
  "procrastinationWindows": [
    {"time": "1:00 PM - 3:00 PM", "type": "high", "label": "High Risk", "description": "Post lunch slump, high phone usage detected"},
    {"time": "9:00 PM - 11:00 PM", "type": "medium", "label": "Medium Risk", "description": "Evening scrolling tendency"}
  ],
  "sleepScore": 72,
  "sleepInsight": "You average 6.5 hours of sleep. Going to bed 30 minutes earlier could significantly improve your morning focus.",
  "mealTimes": {
    "breakfast": "8:00 AM",
    "lunch": "12:30 PM",
    "dinner": "7:30 PM"
  },
  "appInsights": [
    {"app": "Chrome", "weeklyHours": 14, "pattern": "Heavy usage throughout the day", "impact": "neutral"},
    {"app": "Reddit", "weeklyHours": 3, "pattern": "Usage spikes in afternoon", "impact": "negative"}
  ],
  "taskRecommendations": [
    {"taskType": "Deep work / studying", "bestTime": "9:00 AM - 11:00 AM", "reason": "Peak energy and focus window"},
    {"taskType": "Meetings / calls", "bestTime": "11:00 AM - 12:00 PM", "reason": "Still focused but energy slightly lower"},
    {"taskType": "Light tasks / emails", "bestTime": "3:00 PM - 4:00 PM", "reason": "Recovery period after lunch dip"},
    {"taskType": "Creative work", "bestTime": "4:00 PM - 6:00 PM", "reason": "Second wind with creative energy"},
    {"taskType": "Exercise", "bestTime": "6:00 PM - 7:00 PM", "reason": "Natural activity peak in evening"}
  ],
  "personalityInsight": "You are a morning person with a strong focus peak before noon. Your biggest productivity threat is afternoon social media usage.",
  "weeklyScreenTime": 33,
  "procrastinationApps": ["Reddit", "YouTube"]
}

Respond with ONLY the JSON, no explanation, no markdown backticks.`

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
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

export default router