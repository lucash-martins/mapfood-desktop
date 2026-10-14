const BASE_URL = 'http://localhost:8080'

const CHAVE_DESKTOP = 'mapfood-desktop-admin-2026-2f8a91c4e7'

// Imagens vêm do backend como caminho relativo (ex: "/uploads/lojas/xxx.jpg")
export function resolveImagemUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${BASE_URL}${path}`
}

async function processarResposta(res) {
  if (!res.ok) {
    const rawBody = await res.text().catch(() => '')
    let message = rawBody || `HTTP ${res.status}`
    let parsedBody = null
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null
      if (parsedBody && typeof parsedBody === 'object') {
        message = parsedBody.message || parsedBody.error || parsedBody.erro || message
        // Erros de validação (@Valid) vêm como um mapa { campo: mensagem }
        if (message === rawBody) {
          const valores = Object.values(parsedBody).filter(v => typeof v === 'string')
          if (valores.length) message = valores.join(' | ')
        }
      }
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

// apiFetch é usado por chamadas que precisam de rede (login, criação de usuários, administradores)
async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  return processarResposta(res)
}

async function apiFetchAutenticado(path, options = {}) {
  const token = await window.electronAPI?.auth.getToken()
  return apiFetch(path, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  })
}

// Upload de arquivo (multipart/form-data) — não define Content-Type manualmente,
// o browser precisa gerar o boundary automaticamente.
async function apiUpload(path, formData) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'X-Admin-Key': CHAVE_DESKTOP },
    body: formData,
  })
  return processarResposta(res)
}

// Usado nos endpoints de imagem (DELETE) — autoriza pela chave fixa do Desktop
// em vez do JWT de login (ver CHAVE_DESKTOP acima).
async function apiFetchChaveDesktop(path, options = {}) {
  return apiFetch(path, {
    ...options,
    headers: { ...(options.headers || {}), 'X-Admin-Key': CHAVE_DESKTOP },
  })
}

// Auth — fetch direto (sempre precisa de rede)
export async function loginAdmin(email, senha) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha, tipo: 'ADMINISTRADOR' }),
  })
}

// Solicita o link de redefinição de senha por e-mail. Resposta sempre igual, exista ou
// não a conta, então nunca revela quais e-mails de administrador estão cadastrados.
export async function esqueciSenhaAdmin(email) {
  return apiFetch('/auth/esqueci-senha', {
    method: 'POST',
    body: JSON.stringify({ email, tipo: 'ADMINISTRADOR' }),
  })
}

// Criação de usuários — POST direto no backend (endpoints públicos), sempre precisa de rede.
// Depois do sucesso, força um sync para trazer o registro criado para o cache local.
export async function criarConsumidor(data) {
  const criado = await apiFetch('/consumidores', { method: 'POST', body: JSON.stringify(data) })
  window.electronAPI?.sync.forcarSync()
  return criado
}

export async function criarComerciante(data) {
  const criado = await apiFetch('/comerciantes', { method: 'POST', body: JSON.stringify(data) })
  window.electronAPI?.sync.forcarSync()
  return criado
}

// Imagens — POST/DELETE direto no backend (endpoints autenticados, administrador tem acesso a todos).
// Depois do sucesso, força um sync para refletir a nova imagemUrl no cache local.
export async function enviarImagemLoja(id, file) {
  const formData = new FormData()
  formData.append('file', file)
  const atualizado = await apiUpload(`/lojas/${id}/imagem`, formData)
  window.electronAPI?.sync.forcarSync()
  return atualizado
}

export async function removerImagemLoja(id) {
  const atualizado = await apiFetchChaveDesktop(`/lojas/${id}/imagem`, { method: 'DELETE' })
  window.electronAPI?.sync.forcarSync()
  return atualizado
}

export async function enviarGaleriaLoja(id, files) {
  const formData = new FormData()
  for (const file of files) formData.append('files', file)
  const atualizado = await apiUpload(`/lojas/${id}/galeria`, formData)
  window.electronAPI?.sync.forcarSync()
  return atualizado
}

export async function removerImagemGaleriaLoja(id, url) {
  const atualizado = await apiFetchChaveDesktop(`/lojas/${id}/galeria?url=${encodeURIComponent(url)}`, { method: 'DELETE' })
  window.electronAPI?.sync.forcarSync()
  return atualizado
}

export async function enviarImagemConsumidor(id, file) {
  const formData = new FormData()
  formData.append('file', file)
  const atualizado = await apiUpload(`/consumidores/${id}/imagem`, formData)
  window.electronAPI?.sync.forcarSync()
  return atualizado
}

export async function removerImagemConsumidor(id) {
  const atualizado = await apiFetchChaveDesktop(`/consumidores/${id}/imagem`, { method: 'DELETE' })
  window.electronAPI?.sync.forcarSync()
  return atualizado
}

export async function enviarImagemComerciante(id, file) {
  const formData = new FormData()
  formData.append('file', file)
  const atualizado = await apiUpload(`/comerciantes/${id}/imagem`, formData)
  window.electronAPI?.sync.forcarSync()
  return atualizado
}

export async function removerImagemComerciante(id) {
  const atualizado = await apiFetchChaveDesktop(`/comerciantes/${id}/imagem`, { method: 'DELETE' })
  window.electronAPI?.sync.forcarSync()
  return atualizado
}

// Administradores — geridos direto no backend (não fazem parte do cache local/offline)
export async function listarAdministradores() {
  return apiFetchAutenticado('/auth/administradores')
}

export async function criarAdministrador(data) {
  return apiFetchAutenticado('/auth/registrar-admin', { method: 'POST', body: JSON.stringify(data) })
}

export async function atualizarAdministrador(id, data) {
  return apiFetchAutenticado(`/auth/administradores/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deletarAdministrador(id) {
  return apiFetchAutenticado(`/auth/administradores/${id}`, { method: 'DELETE' })
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
export async function atualizarAvaliacao(id, data) {
  return window.electronAPI?.db.atualizarAvaliacao(id, data)
}
export async function deletarAvaliacao(id) {
  return window.electronAPI?.db.deletarAvaliacao(id)
}

// Lojas — via IPC (com fallback via API fetch)
export async function listarLojas() {
  if (window.electronAPI?.db?.listarLojas) {
    return window.electronAPI.db.listarLojas()
  }
  return apiFetch('/lojas')
}
export async function atualizarLoja(id, data) {
  if (window.electronAPI?.db?.atualizarLoja) {
    return window.electronAPI.db.atualizarLoja(id, data)
  }
  return apiFetchAutenticado(`/lojas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Recusa o pedido de Plano Destaque feito pelo comerciante na Web (sempre precisa de rede).
// Depois do sucesso, força um sync para o pedido sumir do cache local.
export async function recusarSolicitacaoDestaque(id) {
  const atualizado = await apiFetchAutenticado(`/lojas/${id}/solicitar-destaque`, { method: 'DELETE' })
  window.electronAPI?.sync.forcarSync()
  return atualizado
}

// Consumidores — via IPC
export async function listarConsumidores() {
  return window.electronAPI?.db.listarConsumidores()
}
export async function atualizarConsumidor(id, data) {
  return window.electronAPI?.db.atualizarConsumidor(id, data)
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
export async function atualizarComerciante(id, data) {
  return window.electronAPI?.db.atualizarComerciante(id, data)
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

// Relatorios — via IPC
export async function getRelatorioStats() {
  return window.electronAPI?.db.getRelatorioStats()
}

// Blog — via IPC
export async function getBlogStats() {
  return window.electronAPI?.db.getBlogStats()
}