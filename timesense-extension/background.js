const API_BASE = 'https://time-sense.onrender.com'

// ── Category config (same as popup.js) ──────────────────────
const CATEGORIES = {
  work: {
    domains: ['github.com', 'gitlab.com', 'stackoverflow.com', 'notion.so', 'figma.com', 'linear.app', 'jira.atlassian.com', 'trello.com', 'asana.com', 'docs.google.com', 'sheets.google.com', 'slides.google.com', 'drive.google.com', 'gmail.com', 'outlook.com', 'slack.com', 'zoom.us', 'meet.google.com', 'vercel.app', 'netlify.app', 'render.com', 'aws.amazon.com', 'npmjs.com', 'pypi.org', 'developer.mozilla.org', 'w3schools.com', 'leetcode.com', 'hackerrank.com']
  },
  entertainment: {
    domains: ['youtube.com', 'netflix.com', 'primevideo.com', 'hotstar.com', 'disneyplus.com', 'twitch.tv', 'spotify.com', 'soundcloud.com', 'reddit.com', 'imgur.com', '9gag.com']
  },
  social: {
    domains: ['twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'linkedin.com', 'tiktok.com', 'snapchat.com', 'pinterest.com', 'whatsapp.com', 'telegram.org', 'discord.com']
  },
  shopping: {
    domains: ['amazon.com', 'amazon.in', 'flipkart.com', 'ebay.com', 'myntra.com', 'meesho.com', 'ajio.com', 'nykaa.com', 'swiggy.com', 'zomato.com']
  },
  news: {
    domains: ['bbc.com', 'cnn.com', 'nytimes.com', 'theguardian.com', 'reuters.com', 'ndtv.com', 'timesofindia.com', 'thehindu.com', 'techcrunch.com', 'theverge.com', 'wired.com']
  },
  learning: {
    domains: ['udemy.com', 'coursera.org', 'edx.org', 'khanacademy.org', 'brilliant.org', 'duolingo.com', 'medium.com', 'substack.com', 'wikipedia.org']
  }
}

const PRODUCTIVE_CATEGORIES = ['work', 'learning']

const getDomain = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return null
  }
}

const categorizeUrl = (url) => {
  const domain = getDomain(url)
  if (!domain) return 'other'
  for (const [cat, config] of Object.entries(CATEGORIES)) {
    if (config.domains.some(d => domain.includes(d))) return cat
  }
  return 'other'
}

// ── Analyze history ──────────────────────────────────────────
const analyzeHistory = async (period = 'today') => {
  const periodMs = {
    today: Date.now() - new Date().setHours(0, 0, 0, 0),
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000
  }

  const startTime = Date.now() - (periodMs[period] || periodMs.today)

  const items = await chrome.history.search({
    text: '',
    startTime,
    maxResults: 5000
  })

  if (items.length === 0) {
    return {
      period,
      totalVisits: 0,
      estimatedMinutes: 0,
      productiveRatio: 0,
      categoryTotals: {},
      topSites: []
    }
  }

  // ── Step 1: Group by domain + collect titles ─────────────
  const domainMap = {}
  const titlesToClassify = []

  for (const item of items) {
    const domain = getDomain(item.url)
    if (!domain) continue

    const title = item.title || domain

    if (!domainMap[domain]) {
      domainMap[domain] = {
        domain,
        visits: 0,
        category: null,
        titles: new Set()
      }
    }

    domainMap[domain].visits += item.visitCount || 1
    if (item.title) domainMap[domain].titles.add(item.title)
  }

  // ── Step 2: Build list of titles to send to AI ───────────
  // Use most common title per domain, max 100 domains
  const domainsToClassify = Object.values(domainMap)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 100)

  for (const d of domainsToClassify) {
    const representativeTitle = [...d.titles][0] || d.domain
    titlesToClassify.push({
      domain: d.domain,
      title: representativeTitle
    })
  }

  // ── Step 3: Send to LLaMA for classification ─────────────
  const { token } = await chrome.storage.local.get('token')

  let aiCategories = {}

  try {
    const res = await fetch(`${API_BASE}/api/insights/classify-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sites: titlesToClassify })
    })

    const data = await res.json()
    // data.categories = [{ domain, category }, ...]
    for (const item of data.categories) {
      aiCategories[item.domain] = item.category
    }
  } catch (e) {
    console.error('AI classification failed, falling back to domain matching', e)
    // Fallback to domain-based categorization
    for (const d of domainsToClassify) {
      aiCategories[d.domain] = categorizeUrl(`https://${d.domain}`)
    }
  }

  // ── Step 4: Apply AI categories to domain map ────────────
  for (const [domain, data] of Object.entries(domainMap)) {
    data.category = aiCategories[domain] || categorizeUrl(`https://${domain}`) || 'other'
  }

  // ── Step 5: Build category totals ───────────────────────
  const categoryTotals = {}
  const allCats = [...Object.keys(CATEGORIES), 'other']
  for (const cat of allCats) {
    categoryTotals[cat] = { visits: 0, sites: [] }
  }

  for (const [domain, data] of Object.entries(domainMap)) {
    const cat = data.category
    if (!categoryTotals[cat]) categoryTotals[cat] = { visits: 0, sites: [] }
    categoryTotals[cat].visits += data.visits
    categoryTotals[cat].sites.push(domain)
  }

  // ── Step 6: Top sites ────────────────────────────────────
  const topSites = Object.values(domainMap)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 8)

  // ── Step 7: Productive ratio ─────────────────────────────
  const totalVisits = items.length
  const estimatedMinutes = totalVisits * 2.5

  const productiveVisits = Object.entries(categoryTotals)
    .filter(([cat]) => PRODUCTIVE_CATEGORIES.includes(cat))
    .reduce((sum, [, data]) => sum + data.visits, 0)

  const productiveRatio = totalVisits > 0 ? productiveVisits / totalVisits : 0

  return {
    period,
    totalVisits,
    estimatedMinutes,
    productiveRatio,
    categoryTotals,
    topSites
  }
}

// ── Send to TimeSense ────────────────────────────────────────
const syncToTimeSense = async () => {
  const { token } = await chrome.storage.local.get('token')
  if (!token) return

  try {
    const data = await analyzeHistory('today')
    await fetch(`${API_BASE}/api/insights/chrome-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })
    console.log('TimeSense: auto-sync complete')
  } catch (e) {
    console.error('TimeSense: auto-sync failed', e)
  }
}

// ── Alarm management ─────────────────────────────────────────
const updateAlarm = (enabled, frequencyHours) => {
  chrome.alarms.clear('timesense-sync')
  if (enabled) {
    chrome.alarms.create('timesense-sync', {
      periodInMinutes: frequencyHours * 60
    })
    console.log(`TimeSense: alarm set every ${frequencyHours}h`)
  }
}

// ── Listeners ────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  const { autoSync, syncFrequency } = await chrome.storage.local.get(['autoSync', 'syncFrequency'])
  if (autoSync) updateAlarm(true, syncFrequency || 24)
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'timesense-sync') syncToTimeSense()
})

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'UPDATE_ALARM') {
    updateAlarm(msg.enabled, msg.frequency)
  }
})