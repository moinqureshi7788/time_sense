const API_BASE = 'https://time-sense.onrender.com'

// ── Category config ─────────────────────────────────────────
const CATEGORIES = {
  work: {
    label: 'Work & Productivity',
    color: '#3b82f6',
    domains: ['github.com', 'gitlab.com', 'stackoverflow.com', 'notion.so', 'figma.com', 'linear.app', 'jira.atlassian.com', 'trello.com', 'asana.com', 'docs.google.com', 'sheets.google.com', 'slides.google.com', 'drive.google.com', 'gmail.com', 'outlook.com', 'slack.com', 'zoom.us', 'meet.google.com', 'vercel.app', 'netlify.app', 'render.com', 'aws.amazon.com', 'console.cloud.google.com', 'npmjs.com', 'pypi.org', 'developer.mozilla.org', 'w3schools.com', 'leetcode.com', 'hackerrank.com']
  },
  entertainment: {
    label: 'Entertainment',
    color: '#ef4444',
    domains: ['youtube.com', 'netflix.com', 'primevideo.com', 'hotstar.com', 'disneyplus.com', 'twitch.tv', 'spotify.com', 'soundcloud.com', 'reddit.com', 'imgur.com', '9gag.com', 'buzzfeed.com']
  },
  social: {
    label: 'Social Media',
    color: '#a855f7',
    domains: ['twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'linkedin.com', 'tiktok.com', 'snapchat.com', 'pinterest.com', 'whatsapp.com', 'telegram.org', 'discord.com']
  },
  shopping: {
    label: 'Shopping',
    color: '#f59e0b',
    domains: ['amazon.com', 'amazon.in', 'flipkart.com', 'ebay.com', 'myntra.com', 'meesho.com', 'ajio.com', 'nykaa.com', 'swiggy.com', 'zomato.com']
  },
  news: {
    label: 'News',
    color: '#06b6d4',
    domains: ['bbc.com', 'cnn.com', 'nytimes.com', 'theguardian.com', 'reuters.com', 'ndtv.com', 'timesofindia.com', 'thehindu.com', 'hindustantimes.com', 'techcrunch.com', 'theverge.com', 'wired.com', 'arstechnica.com']
  },
  learning: {
    label: 'Learning',
    color: '#22c55e',
    domains: ['udemy.com', 'coursera.org', 'edx.org', 'khanacademy.org', 'brilliant.org', 'duolingo.com', 'medium.com', 'substack.com', 'wikipedia.org', 'britannica.com']
  }
}

const PRODUCTIVE_CATEGORIES = ['work', 'learning']

// ── Helpers ─────────────────────────────────────────────────
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

const formatMinutes = (mins) => {
  if (mins < 60) return `${Math.round(mins)}m`
  return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`
}

const getPeriodMs = (period) => {
  const now = Date.now()
  if (period === 'today') return now - (new Date().setHours(0, 0, 0, 0))
  if (period === 'week') return 7 * 24 * 60 * 60 * 1000
  if (period === 'month') return 30 * 24 * 60 * 60 * 1000
  return 24 * 60 * 60 * 1000
}

// ── Storage helpers ──────────────────────────────────────────
const getToken = () => chrome.storage.local.get('token').then(r => r.token)
const getUser = () => chrome.storage.local.get('user').then(r => r.user)

// ── Auth ─────────────────────────────────────────────────────
const login = async (email, password) => {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!res.ok) throw new Error('Invalid credentials')
  return res.json()
}

// ── Read & analyze history ───────────────────────────────────
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

  // Hourly visit tracking
  const hourlyVisits = Array(24).fill(0)
  const hourlyProductivity = Array(24).fill(0)

  for (const item of items) {
    const domain = getDomain(item.url)
    if (!domain) continue

    const title = item.title || domain
    const visitHour = new Date(item.lastVisitTime).getHours()

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

    // Track hourly visits
    hourlyVisits[visitHour]++
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

  // Build hourly pattern (only hours with visits)
  const hourlyPattern = hourlyVisits
    .map((visits, hour) => ({ hour, visits }))
    .filter(h => h.visits > 0)

  // Find peak browsing hours
  const peakHours = [...hourlyPattern]
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 3)
    .map(h => h.hour)

  return {
    period,
    totalVisits,
    estimatedMinutes,
    productiveRatio,
    categoryTotals,
    topSites,
    hourlyPattern,
    peakHours
  }
}

// ── Send to TimeSense ────────────────────────────────────────
const sendToTimeSense = async (data) => {
  const token = await getToken()
  const res = await fetch(`${API_BASE}/api/insights/chrome-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to sync')
  return res.json()
}

// ── Render results ───────────────────────────────────────────
const renderResults = (data) => {
  const { totalVisits, estimatedMinutes, productiveRatio, categoryTotals, topSites } = data

  document.getElementById('total-sites').textContent = totalVisits
  document.getElementById('total-time').textContent = formatMinutes(estimatedMinutes)

  const pct = Math.round(productiveRatio * 100)
  document.getElementById('ratio-bar').style.width = `${pct}%`
  document.getElementById('productive-pct').textContent = `${pct}% productive`
  document.getElementById('unproductive-pct').textContent = `${100 - pct}% unproductive`

  // Categories
  const maxVisits = Math.max(...Object.values(categoryTotals).map(c => c.visits), 1)
  const catList = document.getElementById('categories-list')
  catList.innerHTML = ''

  const allCats = [...Object.entries(CATEGORIES), ['other', { label: 'Other', color: '#6b7280' }]]
  for (const [cat, config] of allCats) {
    const data = categoryTotals[cat]
    if (!data || data.visits === 0) continue
    const pct = Math.round((data.visits / maxVisits) * 100)
    catList.innerHTML += `
      <div class="category-row">
        <div class="category-label">${config.label.split(' ')[0]}</div>
        <div class="category-bar-wrap">
          <div class="category-bar" style="width:${pct}%; background:${config.color}"></div>
        </div>
        <div class="category-pct">${data.visits}</div>
      </div>
    `
  }

  // Top sites
  const sitesList = document.getElementById('top-sites-list')
  sitesList.innerHTML = ''
  for (const site of topSites) {
    const catColor = CATEGORIES[site.category]?.color || '#6b7280'
    sitesList.innerHTML += `
      <div class="site-row" style="display:flex; align-items:center; padding:6px 0; border-bottom:1px solid #1f2937; gap:8px">
        <div style="width:8px; height:8px; border-radius:50%; background:${catColor}; shrink:0"></div>
        <div class="site-domain" style="flex:1; font-size:12px; color:#d1d5db">${site.domain}</div>
        <div class="site-visits" style="font-size:11px; color:#6b7280">${site.visits} visits</div>
      </div>
    `
  }

  document.getElementById('results-section').style.display = 'block'
}

// ── UI state helpers ─────────────────────────────────────────
const showLoading = (text = 'Analyzing your browsing...') => {
  document.getElementById('loading-text').textContent = text
  document.getElementById('loading-section').style.display = 'block'
  document.getElementById('main-section').style.display = 'none'
  document.getElementById('login-section').style.display = 'none'
}

const showMain = () => {
  document.getElementById('loading-section').style.display = 'none'
  document.getElementById('main-section').style.display = 'block'
  document.getElementById('login-section').style.display = 'none'
}

const showLogin = () => {
  document.getElementById('loading-section').style.display = 'none'
  document.getElementById('main-section').style.display = 'none'
  document.getElementById('login-section').style.display = 'block'
}

// ── Init ─────────────────────────────────────────────────────
let currentPeriod = 'today'
let currentData = null

document.addEventListener('DOMContentLoaded', async () => {
  const token = await getToken()
  const user = await getUser()

  if (token && user) {
    document.getElementById('user-name').textContent = user.name || 'User'
    document.getElementById('user-email').textContent = user.email || ''
    showMain()

    // Load sync settings
    const { autoSync, syncFrequency } = await chrome.storage.local.get(['autoSync', 'syncFrequency'])
    document.getElementById('auto-sync-toggle').checked = !!autoSync
    if (syncFrequency) document.getElementById('sync-frequency').value = syncFrequency
  } else {
    showLogin()
  }

  // Period tabs
  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      currentPeriod = tab.dataset.period
      document.getElementById('results-section').style.display = 'none'
      currentData = null
    })
  })

  // Login
  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('email-input').value.trim()
    const password = document.getElementById('password-input').value.trim()
    const errorEl = document.getElementById('login-error')
    errorEl.textContent = ''

    if (!email || !password) {
      errorEl.textContent = 'Please enter email and password.'
      return
    }

    try {
      document.getElementById('login-btn').disabled = true
      document.getElementById('login-btn').textContent = 'Logging in...'
      const data = await login(email, password)
      await chrome.storage.local.set({ token: data.token, user: data.user })
      document.getElementById('user-name').textContent = data.user.name || 'User'
      document.getElementById('user-email').textContent = data.user.email || ''
      showMain()
    } catch (e) {
      errorEl.textContent = 'Invalid email or password.'
    } finally {
      document.getElementById('login-btn').disabled = false
      document.getElementById('login-btn').textContent = 'Login'
    }
  })

  // Allow Enter key on login
  document.getElementById('password-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click()
  })

  // Analyze
  document.getElementById('analyze-btn').addEventListener('click', async () => {
    showLoading('Analyzing your browsing history...')
    try {
      currentData = await analyzeHistory(currentPeriod)
      showMain()
      renderResults(currentData)
    } catch (e) {
      showMain()
      console.error(e)
    }
  })

  // Send to TimeSense
  document.getElementById('send-btn').addEventListener('click', async () => {
    if (!currentData) return
    const btn = document.getElementById('send-btn')
    btn.disabled = true
    btn.textContent = '⏳ Syncing...'
    try {
      await sendToTimeSense(currentData)
      document.getElementById('send-success').style.display = 'block'
      btn.textContent = '✅ Synced!'
    } catch (e) {
      btn.textContent = '❌ Failed — try again'
      btn.disabled = false
    }
  })

  // Auto sync toggle
  document.getElementById('auto-sync-toggle').addEventListener('change', async (e) => {
    const enabled = e.target.checked
    const frequency = parseInt(document.getElementById('sync-frequency').value)
    await chrome.storage.local.set({ autoSync: enabled, syncFrequency: frequency })
    chrome.runtime.sendMessage({ type: 'UPDATE_ALARM', enabled, frequency })
  })

  // Sync frequency change
  document.getElementById('sync-frequency').addEventListener('change', async (e) => {
    const frequency = parseInt(e.target.value)
    const { autoSync } = await chrome.storage.local.get('autoSync')
    await chrome.storage.local.set({ syncFrequency: frequency })
    if (autoSync) {
      chrome.runtime.sendMessage({ type: 'UPDATE_ALARM', enabled: true, frequency })
    }
  })

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await chrome.storage.local.clear()
    showLogin()
    document.getElementById('results-section').style.display = 'none'
    currentData = null
  })
})