const statusBar = document.getElementById('statusBar')
const historyOut = document.getElementById('historyOut')
const requestHistory = []
const MAX_HISTORY = 40

function setStatus(message) {
  statusBar.textContent = message
}

function pushHistory(entry) {
  requestHistory.unshift(entry)
  if (requestHistory.length > MAX_HISTORY) requestHistory.pop()
  historyOut.textContent = JSON.stringify(requestHistory, null, 2)
}

function toJson(form) {
  const data = Object.fromEntries(new FormData(form).entries())
  for (const [k, v] of Object.entries(data)) {
    if (v !== '' && !Number.isNaN(Number(v)) && k !== 'sensor_id' && k !== 'location' && k !== 'type' && !k.includes('Time')) {
      data[k] = Number(v)
    }
  }
  return data
}

async function request(url, options = {}, retries = 1) {
  const method = options.method || 'GET'
  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    const text = await res.text()
    let body = text
    try {
      body = JSON.parse(text)
    } catch {}
    if (!res.ok) {
      const msg = typeof body === 'string' ? body : JSON.stringify(body)
      throw new Error(`HTTP ${res.status} ${msg}`)
    }
    const latencyMs = Date.now() - startedAt
    pushHistory({
      at: new Date().toISOString(),
      method,
      url,
      status: res.status,
      ok: true,
      latency_ms: latencyMs,
    })
    return { ok: true, status: res.status, data: body, latency_ms: latencyMs }
  } catch (err) {
    if (retries > 0) return request(url, options, retries - 1)
    pushHistory({
      at: new Date().toISOString(),
      method,
      url,
      ok: false,
      error: err.message,
      latency_ms: Date.now() - startedAt,
    })
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

function bindForm(formId, outputId, fn) {
  const form = document.getElementById(formId)
  const out = document.getElementById(outputId)
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const button = form.querySelector('button')
    button.disabled = true
    setStatus(`Running ${formId}...`)
    try {
      const result = await fn(form)
      out.textContent = JSON.stringify(result, null, 2)
      setStatus(`${formId} succeeded`)
    } catch (err) {
      out.textContent = err.message
      setStatus(`${formId} failed`)
    } finally {
      button.disabled = false
    }
  })
}

async function refreshHealth() {
  const out = document.getElementById('healthOut')
  setStatus('Refreshing health...')
  try {
    const [gateway, ingestion, dashboard] = await Promise.all([
      request('/health'),
      request('/readings/health'),
      request('/dashboard/health'),
    ])
    out.textContent = JSON.stringify({ gateway, ingestion, dashboard }, null, 2)
    setStatus('Health refresh succeeded')
  } catch (err) {
    out.textContent = err.message
    setStatus('Health refresh failed')
  }
}

document.getElementById('healthBtn').addEventListener('click', refreshHealth)

document.getElementById('alertsBtn').addEventListener('click', async () => {
  const out = document.getElementById('alertsOut')
  setStatus('Fetching alerts...')
  try {
    const alerts = await request('/alerts')
    out.textContent = JSON.stringify(alerts, null, 2)
    setStatus('Alerts fetched')
  } catch (err) {
    out.textContent = err.message
    setStatus('Alerts fetch failed')
  }
})

bindForm('ingestForm', 'ingestOut', (form) =>
  request('/readings/sensor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...toJson(form),
      timestamp: new Date().toISOString(),
    }),
  }),
)

bindForm('sensorPostForm', 'sensorPostOut', (form) =>
  request('/sensors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toJson(form)),
  }),
)

bindForm('sensorGetForm', 'sensorGetOut', async (form) => {
  const data = toJson(form)
  return request(`/sensors/${encodeURIComponent(data.sensor_id)}`)
})

bindForm('reportForm', 'reportOut', async (form) => {
  const data = toJson(form)
  return request('/dashboard/reports/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sensor_id: data.sensor_id,
      start_time: data.startTime,
      end_time: data.endTime,
    }),
  })
})

document.getElementById('clearHistoryBtn').addEventListener('click', () => {
  requestHistory.length = 0
  historyOut.textContent = 'No requests yet.'
})

setInterval(refreshHealth, 15000)
refreshHealth()
setStatus('Ready')
