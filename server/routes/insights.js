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

  // ── Sleep Analysis ──────────────────────────────────────
  const sleepRecords = records.filter(r => r.$.type?.includes('SleepAnalysis'))

  // Group sleep records by night (date of sleep start)
  const sleepByNight = {}
  for (const r of sleepRecords) {
    const start = new Date(r.$.startDate)
    const end = new Date(r.$.endDate)
    const value = r.$.value // Asleep, InBed, Awake, Core, Deep, REM
    const durationMins = (end - start) / 60000

    // Use the date of sleep start (or previous day if after midnight)
    const nightKey = start.getHours() < 12
      ? new Date(start.getTime() - 86400000).toDateString()
      : start.toDateString()

    if (!sleepByNight[nightKey]) {
      sleepByNight[nightKey] = {
        date: nightKey,
        totalMins: 0,
        deepMins: 0,
        remMins: 0,
        coreMins: 0,
        awakeMins: 0,
        inBedMins: 0,
        bedtime: null,
        wakeTime: null
      }
    }

    const night = sleepByNight[nightKey]
    night.inBedMins += durationMins

    if (value?.includes('Asleep') || value?.includes('Core')) {
      night.coreMins += durationMins
      night.totalMins += durationMins
    }
    if (value?.includes('Deep')) {
      night.deepMins += durationMins
      night.totalMins += durationMins
    }
    if (value?.includes('REM')) {
      night.remMins += durationMins
      night.totalMins += durationMins
    }
    if (value?.includes('Awake')) {
      night.awakeMins += durationMins
    }

    // Track earliest bedtime and latest wake time
    if (!night.bedtime || start < new Date(night.bedtime)) {
      night.bedtime = r.$.startDate
    }
    if (!night.wakeTime || end > new Date(night.wakeTime)) {
      night.wakeTime = r.$.endDate
    }
  }

  // Build nightly sleep summary for last 14 nights
  const sleepNights = Object.values(sleepByNight)
    .filter(n => n.totalMins > 60) // filter out naps/noise
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 14)
    .map(n => ({
      date: n.date,
      totalHours: Math.round(n.totalMins / 60 * 10) / 10,
      deepHours: Math.round(n.deepMins / 60 * 10) / 10,
      remHours: Math.round(n.remMins / 60 * 10) / 10,
      coreHours: Math.round(n.coreMins / 60 * 10) / 10,
      awakeHours: Math.round(n.awakeMins / 60 * 10) / 10,
      qualityScore: Math.round(((n.deepMins + n.remMins) / Math.max(n.totalMins, 1)) * 100),
      bedtime: n.bedtime ? new Date(n.bedtime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
      wakeTime: n.wakeTime ? new Date(n.wakeTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null
    }))

  // Calculate averages
  const avgSleep = sleepNights.length > 0 ? {
    avgTotalHours: Math.round(sleepNights.reduce((s, n) => s + n.totalHours, 0) / sleepNights.length * 10) / 10,
    avgDeepHours: Math.round(sleepNights.reduce((s, n) => s + n.deepHours, 0) / sleepNights.length * 10) / 10,
    avgRemHours: Math.round(sleepNights.reduce((s, n) => s + n.remHours, 0) / sleepNights.length * 10) / 10,
    avgQualityScore: Math.round(sleepNights.reduce((s, n) => s + n.qualityScore, 0) / sleepNights.length),
    avgBedtime: sleepNights[0]?.bedtime || null,
    avgWakeTime: sleepNights[0]?.wakeTime || null,
    consistency: sleepNights.length >= 3 ? Math.round(100 - (Math.max(...sleepNights.map(n => n.totalHours)) - Math.min(...sleepNights.map(n => n.totalHours))) * 10) : null
  } : null

  // ── Steps ───────────────────────────────────────────────
  // Group steps by hour to find activity patterns
  const stepsByHour = {}
  for (const r of records.filter(r => r.$.type?.includes('StepCount'))) {
    const hour = new Date(r.$.startDate).getHours()
    stepsByHour[hour] = (stepsByHour[hour] || 0) + parseFloat(r.$.value || 0)
  }

  const hourlySteps = Object.entries(stepsByHour)
    .map(([hour, steps]) => ({ hour: parseInt(hour), steps: Math.round(steps) }))
    .sort((a, b) => a.hour - b.hour)

  const totalSteps = hourlySteps.reduce((s, h) => s + h.steps, 0)
  const mostActiveHour = hourlySteps.sort((a, b) => b.steps - a.steps)[0]?.hour || null

  // ── Heart Rate ──────────────────────────────────────────
  const heartRateRecords = records.filter(r => r.$.type?.includes('HeartRate'))
  const hrByHour = {}
  for (const r of heartRateRecords) {
    const hour = new Date(r.$.startDate).getHours()
    if (!hrByHour[hour]) hrByHour[hour] = []
    hrByHour[hour].push(parseFloat(r.$.value || 0))
  }

  const hourlyHeartRate = Object.entries(hrByHour)
    .map(([hour, values]) => ({
      hour: parseInt(hour),
      avgBpm: Math.round(values.reduce((s, v) => s + v, 0) / values.length)
    }))
    .sort((a, b) => a.hour - b.hour)

  const restingHR = hourlyHeartRate
    .filter(h => h.hour >= 0 && h.hour <= 6)
    .reduce((s, h, _, arr) => s + h.avgBpm / arr.length, 0)

  // ── Active Energy ───────────────────────────────────────
  const activityRecords = records.filter(r => r.$.type?.includes('ActiveEnergyBurned'))
  const energyByHour = {}
  for (const r of activityRecords) {
    const hour = new Date(r.$.startDate).getHours()
    energyByHour[hour] = (energyByHour[hour] || 0) + parseFloat(r.$.value || 0)
  }

  const hourlyActivity = Object.entries(energyByHour)
    .map(([hour, calories]) => ({ hour: parseInt(hour), calories: Math.round(calories) }))
    .sort((a, b) => a.hour - b.hour)

  return {
    sleep: {
      nights: sleepNights,
      averages: avgSleep
    },
    steps: {
      hourly: hourlySteps,
      total: totalSteps,
      mostActiveHour
    },
    heartRate: {
      hourly: hourlyHeartRate,
      restingBpm: Math.round(restingHR) || null
    },
    activity: {
      hourly: hourlyActivity
    }
  }
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
// ── Step 2: Full Analysis ───────────────────────────────────
router.post('/analyze', verifyToken, upload.single('healthZip'), async (req, res) => {
  try {
    const { screenTimeData } = req.body
    let healthSummary = 'No health data provided.'
    let chromeSummary = 'No Chrome browsing data provided.'

    // ── Fetch latest Chrome history from DB ─────────────────
    const chromeHistory = await prisma.chromeHistory.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    })

    if (chromeHistory) {
      const cats = chromeHistory.categoryTotals
      const topSites = chromeHistory.topSites
      const productive = Math.round(chromeHistory.productiveRatio * 100)

      chromeSummary = `
Chrome Browsing Data (${chromeHistory.period}):
- Total visits: ${chromeHistory.totalVisits}
- Estimated browsing time: ${Math.round(chromeHistory.estimatedMinutes)} minutes
- Productive ratio: ${productive}% productive, ${100 - productive}% unproductive

Peak browsing hours: ${chromeHistory.peakHours?.map(h => `${h}:00`).join(', ')}

Hourly browsing pattern:
${chromeHistory.hourlyPattern?.map(h => `  ${h.hour}:00 — ${h.visits} visits`).join('\n')}

Category breakdown:
${Object.entries(cats).map(([cat, data]) => `  - ${cat}: ${data.visits} visits (sites: ${data.sites?.slice(0, 3).join(', ')})`).join('\n')}

Top sites visited:
${topSites.slice(0, 5).map(s => `  - ${s.domain}: ${s.visits} visits (${s.category})`).join('\n')}
`
    }

    // ── Health data ─────────────────────────────────────────
    if (req.file) {
      try {
        const xmlString = await extractXMLFromZip(req.file.buffer)
        if (xmlString) {
          const healthData = await parseHealthXML(xmlString)
const s = healthData.sleep
const avgS = s.averages

healthSummary = `
SLEEP ANALYSIS (last ${s.nights.length} nights):
- Average sleep duration: ${avgS?.avgTotalHours}h per night
- Average deep sleep: ${avgS?.avgDeepHours}h
- Average REM sleep: ${avgS?.avgRemHours}h
- Sleep quality score: ${avgS?.avgQualityScore}/100
- Average bedtime: ${avgS?.avgBedtime}
- Average wake time: ${avgS?.avgWakeTime}
- Sleep consistency: ${avgS?.consistency}/100
- Nightly breakdown: ${JSON.stringify(s.nights.slice(0, 7))}

STEPS & ACTIVITY:
- Total steps tracked: ${healthData.steps.total}
- Most active hour: ${healthData.steps.mostActiveHour}:00
- Hourly step pattern: ${JSON.stringify(healthData.steps.hourly)}

HEART RATE:
- Resting heart rate: ${healthData.heartRate.restingBpm} bpm
- Hourly heart rate: ${JSON.stringify(healthData.heartRate.hourly)}

ACTIVE ENERGY BY HOUR:
${JSON.stringify(healthData.activity.hourly)}
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

CHROME BROWSING DATA (from Chrome extension):
${chromeSummary}

Use ALL three data sources together to build the most accurate picture of this person's behavior. 
- Use Chrome data to understand what they were actually doing on their computer
- Use Screen Time to understand mobile app usage patterns
- Use Health data to understand sleep and activity patterns
- Cross-reference all three to find when they were truly productive vs procrastinating

Based on this data, generate a JSON response with exactly this structure:
{
  "energyCurve": [
    {"hour": "6 AM", "energy": <number 0-100 based on data>, "label": "<label>"},
    {"hour": "7 AM", "energy": <number>, "label": "<label>"},
    {"hour": "8 AM", "energy": <number>, "label": "<label>"},
    {"hour": "9 AM", "energy": <number>, "label": "<label>"},
    {"hour": "10 AM", "energy": <number>, "label": "<label>"},
    {"hour": "11 AM", "energy": <number>, "label": "<label>"},
    {"hour": "12 PM", "energy": <number>, "label": "<label>"},
    {"hour": "1 PM", "energy": <number>, "label": "<label>"},
    {"hour": "2 PM", "energy": <number>, "label": "<label>"},
    {"hour": "3 PM", "energy": <number>, "label": "<label>"},
    {"hour": "4 PM", "energy": <number>, "label": "<label>"},
    {"hour": "5 PM", "energy": <number>, "label": "<label>"},
    {"hour": "6 PM", "energy": <number>, "label": "<label>"},
    {"hour": "7 PM", "energy": <number>, "label": "<label>"},
    {"hour": "8 PM", "energy": <number>, "label": "<label>"},
    {"hour": "9 PM", "energy": <number>, "label": "<label>"},
    {"hour": "10 PM", "energy": <number>, "label": "<label>"}
  ],
  "focusWindows": [
    {"time": "<time range>", "type": "<peak|good>", "label": "<label>", "description": "<why, referencing their actual data>"}
  ],
  "procrastinationWindows": [
    {"time": "<time range>", "type": "<high|medium>", "label": "<label>", "description": "<why, referencing their actual apps and sites>"}
  ],
  "sleepScore": <0-100>,
  "sleepInsight": "<personalized to their actual sleep data>",
  "appInsights": [
    {"app": "<actual app or site from their data>", "weeklyHours": <number>, "pattern": "<observed pattern>", "impact": "<positive|neutral|negative>"}
  ],
  "taskRecommendations": [
    {"taskType": "<type>", "bestTime": "<time>", "reason": "<reason tied to their specific data>"}
  ],
  "personalityInsight": "<specific to their actual usage patterns across all three data sources>",
  "weeklyScreenTime": <number from their data>,
  "procrastinationApps": ["<actual apps and sites from their data>"],
  "chromeInsight": "<one sentence about their browsing behavior based on Chrome data>"
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
    hourlyPattern: hourlyPattern || [],
    peakHours: peakHours || []
  }
})

    res.json({ message: 'Chrome history synced successfully' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to save chrome history' })
  }
})

export default router