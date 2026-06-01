const http = require('http')
const database = require('./database')
const notificationService = require('./notificationService')
const connectivityService = require('./connectivityService')

const BASE_URL = 'http://localhost:8080'
const SYNC_INTERVAL_MS = 5 * 60 * 1000

let _timer = null
let _syncing = false
let _pendingRetry = false
let _win = null

// ─── HTTP helpers ──────────────────────────────────────────────────────────

function httpRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'localhost',
      port: 8080,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: 8000,
    }
    const req = http.request(options, (res) => {
      let raw = ''
      res.on('data', (chunk) => { raw += chunk })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null }) }
          catch { resolve({ status: res.statusCode, body: raw }) }
        } else {
          reject(Object.assign(new Error(`HTTP ${res.statusCode}`), { status: res.statusCode }))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    if (data) req.write(data)
    req.end()
  })
}

// ─── Push pending operations ───────────────────────────────────────────────

function buildLojaPayload(p) {
  return {
    nome: p.nome ?? null,
    descricao: p.descricao ?? null,
    statusLoja: p.statusLoja === 'SUSPENSA' ? 'INATIVA' : (p.statusLoja ?? null),
    dataCadastro: p.dataCadastro ?? null,
  }
}

function buildDenunciaPayload(p) {
  return {
    descricao: p.descricao ?? null,
    statusDenuncia: p.statusDenuncia ?? null,
    dataDenuncia: p.dataDenuncia ?? null,
  }
}

async function pushPendingOps(token) {
  const ops = database.getPendingOps()
  for (const op of ops) {
    try {
      if (op.operation === 'update') {
        let apiPath = null
        let payload = null
        if (op.entity === 'loja') {
          apiPath = `/lojas/${op.entity_id}`
          payload = buildLojaPayload(op.payload)
        } else if (op.entity === 'denuncia') {
          apiPath = `/denuncias/${op.entity_id}`
          payload = buildDenunciaPayload(op.payload)
        }
        if (apiPath) await httpRequest('PUT', apiPath, payload, token)
      } else if (op.operation === 'delete') {
        const pathMap = {
          avaliacao: `/avaliacoes/${op.entity_id}`,
          consumidor: `/consumidores/${op.entity_id}`,
          comerciante: `/comerciantes/${op.entity_id}`,
          loja: `/lojas/${op.entity_id}`,
        }
        const apiPath = pathMap[op.entity]
        if (apiPath) await httpRequest('DELETE', apiPath, null, token)
      }
      database.removePendingOp(op.id)
      if (op.operation === 'update') {
        if (op.entity === 'loja') database.marcarLojaSync(op.entity_id)
        if (op.entity === 'denuncia') database.marcarDenunciaSync(op.entity_id)
      }
      if (op.operation === 'delete') {
        if (op.entity === 'consumidor') database.removerConsumidor(op.entity_id)
        if (op.entity === 'comerciante') database.removerComerciante(op.entity_id)
        if (op.entity === 'avaliacao') database.removerAvaliacao(op.entity_id)
        if (op.entity === 'loja') database.removerLoja(op.entity_id)
      }
    } catch (err) {
      console.error(`[sync] Push ${op.entity}#${op.entity_id} falhou:`, err.status, err.message)
      if (err.status && err.status >= 400 && err.status < 500) {
        // Erro permanente de negócio (4xx) — descarta o pending_op sem retry
        console.warn(`[sync] Descartando op ${op.id} (${op.entity}#${op.entity_id}): erro permanente ${err.status}`)
        database.removePendingOp(op.id)
      } else {
        database.incrementPendingOpRetry(op.id, err.message)
      }
    }
  }
}

// ─── Pull from server ──────────────────────────────────────────────────────

async function pullAll(token) {
  const endpoints = [
    { path: '/lojas', upsert: (item) => database.upsertLoja(item) },
    { path: '/denuncias', upsert: (item) => database.upsertDenuncia(item) },
    { path: '/avaliacoes', upsert: (item) => database.upsertAvaliacao(item) },
    { path: '/consumidores', upsert: (item) => database.upsertConsumidor(item) },
    { path: '/comerciantes', upsert: (item) => database.upsertComerciante(item) },
  ]

  await Promise.all(endpoints.map(async ({ path, upsert }) => {
    try {
      const { body } = await httpRequest('GET', path, null, token)
      const items = Array.isArray(body) ? body : (body?.content ?? [])
      for (const item of items) upsert(item)
    } catch (err) {
      console.warn(`[sync] Pull ${path} falhou:`, err.message)
    }
  }))
}

// ─── Sync completo ─────────────────────────────────────────────────────────

async function syncCompleto(win) {
  if (_syncing) {
    // Marca para retry assim que o sync atual terminar
    _pendingRetry = true
    return { sucesso: false, erro: 'Sync ja em andamento' }
  }
  _syncing = true
  _pendingRetry = false

  const w = win || _win
  if (w) w.webContents.send('sync:status-changed', { estado: 'syncing' })

  try {
    const token = database.get('admin_token')
    if (!token) throw new Error('Sem token de autenticacao')

    await pushPendingOps(token)
    await pullAll(token)

    const timestamp = new Date().toISOString()
    database.set('ultima_sync', timestamp)

    notificationService.verificarDenuncias(w)

    if (w) w.webContents.send('sync:status-changed', { estado: 'idle', timestamp })
    console.log('[sync] Sync concluido em', timestamp)
    return { sucesso: true }
  } catch (err) {
    console.error('[sync] Erro:', err.message)
    if (w) w.webContents.send('sync:status-changed', { estado: 'erro', mensagem: err.message })
    return { sucesso: false, erro: err.message }
  } finally {
    _syncing = false
    // Se algum pending_op foi adicionado durante este sync, re-executa em 5s
    if (_pendingRetry) {
      _pendingRetry = false
      setTimeout(() => syncCompleto(w || _win), 5000)
    }
  }
}

// ─── Auto-sync ─────────────────────────────────────────────────────────────

function scheduleNext() {
  _timer = setTimeout(async () => {
    if (connectivityService.isOnline()) await syncCompleto(_win)
    scheduleNext()
  }, SYNC_INTERVAL_MS)
}

function _aguardarOnlineParaSync(win, tentativas) {
  if (connectivityService.isOnline()) {
    syncCompleto(win).catch(() => {})
  } else if (tentativas < 12) {
    setTimeout(() => _aguardarOnlineParaSync(win, tentativas + 1), 500)
  }
}

function start(win) {
  _win = win
  // Dispara sync assim que conectividade for confirmada (poll a cada 500ms, máx 6s)
  _aguardarOnlineParaSync(win, 0)
  scheduleNext()
}

function stop() {
  if (_timer) { clearTimeout(_timer); _timer = null }
}

async function eliminarEntidade(entity, entityId, token) {
  const pathMap = {
    consumidor: `/consumidores/${entityId}`,
    comerciante: `/comerciantes/${entityId}`,
    avaliacao: `/avaliacoes/${entityId}`,
  }
  const path = pathMap[entity]
  if (path) await httpRequest('DELETE', path, null, token)
}

module.exports = { start, stop, syncCompleto, eliminarEntidade }
