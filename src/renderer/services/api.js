const BASE_URL = 'http://localhost:8080'

// apiFetch é usado apenas pelo loginAdmin (precisa de rede)
async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const rawBody = await res.text().catch(() => '')
    let message = rawBody || `HTTP ${res.status}`
    let parsedBody = null
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null
      message = parsedBody?.message || parsedBody?.error || message
    } catch {
      // Keep the raw body as the message when it's not JSON.
    }
    const err = new Error(message)
    err.status = res.status
    err.body = parsedBody || rawBody
    throw err
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// Auth — fetch direto (sempre precisa de rede)
export async function loginAdmin(email, senha) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha, tipo: 'ADMINISTRADOR' }),
  })
}

// Denuncias — via IPC (SQLite local)
export async function listarDenuncias() {
  return window.electronAPI?.db.listarDenuncias()
}
export async function atualizarDenuncia(id, data) {
  return window.electronAPI?.db.atualizarDenuncia(id, data)
}

// Avaliacoes — via IPC
export async function listarAvaliacoes() {
  return window.electronAPI?.db.listarAvaliacoes()
}
export async function deletarAvaliacao(id) {
  return window.electronAPI?.db.deletarAvaliacao(id)
}

// Lojas — via IPC
export async function listarLojas() {
  return window.electronAPI?.db.listarLojas()
}
export async function atualizarLoja(id, data) {
  return window.electronAPI?.db.atualizarLoja(id, data)
}

// Consumidores — via IPC
export async function listarConsumidores() {
  return window.electronAPI?.db.listarConsumidores()
}
export async function deletarConsumidor(id) {
  return window.electronAPI?.db.deletarConsumidor(id)
}
export async function deletarConsumidorCascade(id) {
  return window.electronAPI?.db.deletarConsumidorCascade(id)
}
export async function verificarDadosConsumidor(id) {
  return window.electronAPI?.db.verificarDadosConsumidor(id)
}

// Comerciantes — via IPC
export async function listarComerciantes() {
  return window.electronAPI?.db.listarComerciantes()
}
export async function deletarComerciante(id) {
  return window.electronAPI?.db.deletarComerciante(id)
}
export async function deletarComercianteCascade(id) {
  return window.electronAPI?.db.deletarComercianteCascade(id)
}
export async function verificarDadosComerciante(id) {
  return window.electronAPI?.db.verificarDadosComerciante(id)
}