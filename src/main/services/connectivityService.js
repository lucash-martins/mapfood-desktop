const http = require('http')

const BACKEND_URL = 'http://localhost:8080'
const TEST_PATH = '/auth/login'
const TIMEOUT_MS = 3000
const POLL_ONLINE_MS = 15000
const POLL_OFFLINE_MS = 8000

let _isOnline = false
let _consecutiveSuccesses = 0
let _timer = null
let _win = null

function checkConnectivity() {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: 'localhost', port: 8080, path: TEST_PATH, method: 'HEAD', timeout: TIMEOUT_MS },
      (res) => { res.resume(); resolve(true) }
    )
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
    req.end()
  })
}

async function poll() {
  const reachable = await checkConnectivity()

  if (reachable) {
    _consecutiveSuccesses++
    if (!_isOnline && _consecutiveSuccesses >= 2) {
      _isOnline = true
      _consecutiveSuccesses = 0
      console.log('[connectivity] Backend ONLINE')
      if (_win) _win.webContents.send('app:status-conexao-changed', true)
    }
  } else {
    _consecutiveSuccesses = 0
    if (_isOnline) {
      _isOnline = false
      console.log('[connectivity] Backend OFFLINE')
      if (_win) _win.webContents.send('app:status-conexao-changed', false)
    }
  }

  _timer = setTimeout(poll, _isOnline ? POLL_ONLINE_MS : POLL_OFFLINE_MS)
}

function start(win) {
  _win = win
  poll()
}

function stop() {
  if (_timer) { clearTimeout(_timer); _timer = null }
}

function isOnline() {
  return _isOnline
}

module.exports = { start, stop, isOnline }