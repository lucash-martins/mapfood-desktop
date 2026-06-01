const path = require('path')
const { app } = require('electron')

let db = null

// ─── camelCase ↔ snake_case helpers ────────────────────────────────────────

// Spring Boot pode serializar LocalDateTime como array [year,month,day,hour,min,sec,nano]
function normalizarData(val) {
  if (!val) return null
  if (Array.isArray(val)) {
    const [y, m, d, h = 0, min = 0, s = 0] = val
    // Constrói ISO sem timezone para o backend parsear como LocalDateTime
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }
  return String(val)
}

function lojaToRow(loja) {
  return {
    id: loja.id,
    nome: loja.nome ?? null,
    descricao: loja.descricao ?? null,
    status_loja: loja.statusLoja ?? null,
    data_cadastro: normalizarData(loja.dataCadastro),
    // Comerciante.getId_comerciante() → JSON key é 'id_comerciante' (snake_case)
    comerciante_id: loja.comerciante?.id_comerciante ?? loja.comerciante?.id ?? loja.comercianteId ?? null,
    comerciante_nome: loja.comerciante?.nome ?? loja.comercianteNome ?? null,
    synced_at: new Date().toISOString(),
  }
}

function rowToLoja(row) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    statusLoja: row.status_loja,
    dataCadastro: row.data_cadastro,
    comercianteId: row.comerciante_id,
    comercianteNome: row.comerciante_nome,
    comerciante: row.comerciante_id
      ? { id: row.comerciante_id, id_comerciante: row.comerciante_id, nome: row.comerciante_nome }
      : null,
    syncedAt: row.synced_at,
    dirty: !!row.dirty,
  }
}

function denunciaToRow(d) {
  return {
    id: d.id,
    loja_id: d.lojaId ?? d.loja?.id ?? null,
    loja_nome: d.lojaNome ?? d.loja?.nome ?? null,
    consumidor_id: d.consumidorId ?? d.consumidor?.id ?? null,
    consumidor_nome: d.consumidorNome ?? d.consumidor?.nome ?? null,
    descricao: d.descricao ?? null,
    status_denuncia: d.statusDenuncia ?? null,
    data_denuncia: normalizarData(d.dataDenuncia),
    synced_at: new Date().toISOString(),
  }
}

function rowToDenuncia(row) {
  return {
    id: row.id,
    lojaId: row.loja_id,
    loja: { id: row.loja_id, nome: row.loja_nome },
    consumidor: { id: row.consumidor_id, nome: row.consumidor_nome },
    descricao: row.descricao,
    statusDenuncia: row.status_denuncia,
    dataDenuncia: row.data_denuncia,
    syncedAt: row.synced_at,
    dirty: !!row.dirty,
  }
}

function avaliacaoToRow(a) {
  return {
    id: a.id,
    loja_id: a.lojaId ?? a.loja?.id ?? null,
    loja_nome: a.lojaNome ?? a.loja?.nome ?? null,
    consumidor_id: a.consumidorId ?? a.consumidor?.id ?? null,
    consumidor_nome: a.consumidorNome ?? a.consumidor?.nome ?? null,
    nota: a.nota ?? null,
    comentario: a.comentario ?? null,
    data_avaliacao: normalizarData(a.dataAvaliacao),
    synced_at: new Date().toISOString(),
  }
}

function rowToAvaliacao(row) {
  return {
    id: row.id,
    loja: { id: row.loja_id, nome: row.loja_nome },
    consumidor: { id: row.consumidor_id, nome: row.consumidor_nome },
    nota: row.nota,
    comentario: row.comentario,
    dataAvaliacao: row.data_avaliacao,
    syncedAt: row.synced_at,
  }
}

function consumidorToRow(c) {
  return {
    id: c.id,
    nome: c.nome ?? null,
    email: c.email ?? null,
    cpf: c.cpf ?? null,
    celular: c.celular ?? null,
    synced_at: new Date().toISOString(),
  }
}

function rowToConsumidor(row) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    cpf: row.cpf,
    celular: row.celular,
    syncedAt: row.synced_at,
  }
}

function comercianteToRow(c) {
  return {
    // Tenta id_comerciante, idComerciante, idUsuario (PK unificada), id — nesta ordem
    id_comerciante: c.id_comerciante ?? c.idComerciante ?? c.idUsuario ?? c.id ?? null,
    nome: c.nome ?? null,
    email: c.email ?? null,
    synced_at: new Date().toISOString(),
  }
}

function rowToComerciante(row) {
  return {
    id: row.id_comerciante,
    id_comerciante: row.id_comerciante,
    idComerciante: row.id_comerciante,
    nome: row.nome,
    email: row.email,
    syncedAt: row.synced_at,
  }
}

// ─── DDL ───────────────────────────────────────────────────────────────────

const DDL = `
CREATE TABLE IF NOT EXISTS schema_version (
  version    INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lojas (
  id               INTEGER PRIMARY KEY,
  nome             TEXT,
  descricao        TEXT,
  status_loja      TEXT,
  data_cadastro    TEXT,
  comerciante_id   INTEGER,
  comerciante_nome TEXT,
  synced_at        TEXT,
  dirty            INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS denuncias (
  id               INTEGER PRIMARY KEY,
  loja_id          INTEGER,
  loja_nome        TEXT,
  consumidor_id    INTEGER,
  consumidor_nome  TEXT,
  descricao        TEXT,
  status_denuncia  TEXT,
  data_denuncia    TEXT,
  synced_at        TEXT,
  dirty            INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS avaliacoes (
  id               INTEGER PRIMARY KEY,
  loja_id          INTEGER,
  loja_nome        TEXT,
  consumidor_id    INTEGER,
  consumidor_nome  TEXT,
  nota             INTEGER,
  comentario       TEXT,
  data_avaliacao   TEXT,
  synced_at        TEXT,
  deleted_locally  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS consumidores (
  id               INTEGER PRIMARY KEY,
  nome             TEXT,
  email            TEXT,
  cpf              TEXT,
  celular          TEXT,
  synced_at        TEXT,
  deleted_locally  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS comerciantes (
  id_comerciante   INTEGER PRIMARY KEY,
  nome             TEXT,
  email            TEXT,
  synced_at        TEXT,
  deleted_locally  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pending_ops (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  entity     TEXT NOT NULL,
  entity_id  INTEGER NOT NULL,
  operation  TEXT NOT NULL,
  payload    TEXT,
  retries    INTEGER DEFAULT 0,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_denuncias_status ON denuncias(status_denuncia);
CREATE INDEX IF NOT EXISTS idx_lojas_status ON lojas(status_loja);
CREATE INDEX IF NOT EXISTS idx_pending_ops_entity ON pending_ops(entity, entity_id);
`

// ─── Initialize ────────────────────────────────────────────────────────────

function initialize() {
  const Database = require('better-sqlite3')
  const dbPath = path.join(app.getPath('userData'), 'mapfood.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(DDL)
  _runMigrations()
  _limparDuplicatas()
  console.log('[database] Initialized at', dbPath)
}

function _runMigrations() {
  const v = db.prepare('SELECT COALESCE(MAX(version), 0) as v FROM schema_version').get().v
  if (v < 1) {
    try { db.prepare('ALTER TABLE lojas ADD COLUMN deleted_locally INTEGER DEFAULT 0').run() } catch (_) {}
    db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (1)').run()
    console.log('[database] Migration v1: lojas.deleted_locally')
  }
}

function _limparDuplicatas() {
  // upsertComerciante já rejeita inserções sem id_comerciante — apenas limpa resquícios antigos com ID nulo
  db.prepare('DELETE FROM comerciantes WHERE id_comerciante IS NULL').run()
  // Remove pending_ops com entity_id nulo (crash de NOT NULL constraint)
  db.prepare('DELETE FROM pending_ops WHERE entity_id IS NULL').run()
}

// ─── Config ────────────────────────────────────────────────────────────────

function get(key) {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key)
  return row ? row.value : null
}

function set(key, value) {
  if (value === null || value === undefined) {
    db.prepare('DELETE FROM config WHERE key = ?').run(key)
  } else {
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, String(value))
  }
}

// ─── Lojas ─────────────────────────────────────────────────────────────────

function listarLojas() {
  return db.prepare('SELECT * FROM lojas WHERE deleted_locally = 0 ORDER BY nome').all().map(rowToLoja)
}

function upsertLoja(loja) {
  const row = lojaToRow(loja)
  db.prepare(`
    INSERT INTO lojas (id, nome, descricao, status_loja, data_cadastro, comerciante_id, comerciante_nome, synced_at, dirty)
    VALUES (@id, @nome, @descricao, @status_loja, @data_cadastro, @comerciante_id, @comerciante_nome, @synced_at, 0)
    ON CONFLICT(id) DO UPDATE SET
      nome             = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN nome             ELSE excluded.nome             END,
      descricao        = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN descricao        ELSE excluded.descricao        END,
      status_loja      = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN status_loja      ELSE excluded.status_loja      END,
      data_cadastro    = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN data_cadastro    ELSE excluded.data_cadastro    END,
      comerciante_id   = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN comerciante_id   ELSE excluded.comerciante_id   END,
      comerciante_nome = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN comerciante_nome ELSE excluded.comerciante_nome END,
      synced_at        = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN synced_at        ELSE excluded.synced_at        END,
      deleted_locally  = CASE WHEN deleted_locally = 1 THEN 1 ELSE 0 END
  `).run(row)
}

function marcarLojaExcluida(id) {
  db.prepare('UPDATE lojas SET deleted_locally = 1 WHERE id = ?').run(id)
}

function atualizarLoja(id, data) {
  const existing = db.prepare('SELECT * FROM lojas WHERE id = ?').get(id)
  if (!existing) throw new Error(`Loja ${id} nao encontrada`)
  const merged = {
    ...lojaToRow({ ...rowToLoja(existing), ...data }),
    dirty: 1,
    id,
  }
  db.prepare(`
    UPDATE lojas SET
      nome=@nome, descricao=@descricao, status_loja=@status_loja,
      data_cadastro=@data_cadastro, comerciante_id=@comerciante_id,
      comerciante_nome=@comerciante_nome, dirty=@dirty
    WHERE id=@id
  `).run(merged)
  return rowToLoja(db.prepare('SELECT * FROM lojas WHERE id = ?').get(id))
}

function marcarLojaSync(id) {
  db.prepare('UPDATE lojas SET dirty = 0 WHERE id = ?').run(id)
}

// ─── Denuncias ─────────────────────────────────────────────────────────────

function listarDenuncias() {
  return db.prepare('SELECT * FROM denuncias ORDER BY data_denuncia DESC').all().map(rowToDenuncia)
}

function upsertDenuncia(denuncia) {
  const row = denunciaToRow(denuncia)
  db.prepare(`
    INSERT INTO denuncias (id, loja_id, loja_nome, consumidor_id, consumidor_nome, descricao, status_denuncia, data_denuncia, synced_at, dirty)
    VALUES (@id, @loja_id, @loja_nome, @consumidor_id, @consumidor_nome, @descricao, @status_denuncia, @data_denuncia, @synced_at, 0)
    ON CONFLICT(id) DO UPDATE SET
      loja_id         = CASE WHEN dirty = 1 THEN loja_id         ELSE excluded.loja_id         END,
      loja_nome       = CASE WHEN dirty = 1 THEN loja_nome       ELSE excluded.loja_nome       END,
      consumidor_id   = CASE WHEN dirty = 1 THEN consumidor_id   ELSE excluded.consumidor_id   END,
      consumidor_nome = CASE WHEN dirty = 1 THEN consumidor_nome ELSE excluded.consumidor_nome END,
      descricao       = CASE WHEN dirty = 1 THEN descricao       ELSE excluded.descricao       END,
      status_denuncia = CASE WHEN dirty = 1 THEN status_denuncia ELSE excluded.status_denuncia END,
      data_denuncia   = CASE WHEN dirty = 1 THEN data_denuncia   ELSE excluded.data_denuncia   END,
      synced_at       = CASE WHEN dirty = 1 THEN synced_at       ELSE excluded.synced_at       END
  `).run(row)
}

function atualizarDenuncia(id, data) {
  const existing = db.prepare('SELECT * FROM denuncias WHERE id = ?').get(id)
  if (!existing) throw new Error(`Denuncia ${id} nao encontrada`)
  const merged = {
    ...denunciaToRow({ ...rowToDenuncia(existing), ...data }),
    dirty: 1,
    id,
  }
  db.prepare(`
    UPDATE denuncias SET
      loja_id=@loja_id, loja_nome=@loja_nome, consumidor_id=@consumidor_id,
      consumidor_nome=@consumidor_nome, descricao=@descricao,
      status_denuncia=@status_denuncia, data_denuncia=@data_denuncia, dirty=@dirty
    WHERE id=@id
  `).run(merged)
  return rowToDenuncia(db.prepare('SELECT * FROM denuncias WHERE id = ?').get(id))
}

function marcarDenunciaSync(id) {
  db.prepare('UPDATE denuncias SET dirty = 0 WHERE id = ?').run(id)
}

// ─── Avaliacoes ────────────────────────────────────────────────────────────

function listarAvaliacoes() {
  return db.prepare('SELECT * FROM avaliacoes WHERE deleted_locally = 0 ORDER BY data_avaliacao DESC').all().map(rowToAvaliacao)
}

function upsertAvaliacao(avaliacao) {
  const row = avaliacaoToRow(avaliacao)
  db.prepare(`
    INSERT INTO avaliacoes (id, loja_id, loja_nome, consumidor_id, consumidor_nome, nota, comentario, data_avaliacao, synced_at, deleted_locally)
    VALUES (@id, @loja_id, @loja_nome, @consumidor_id, @consumidor_nome, @nota, @comentario, @data_avaliacao, @synced_at, 0)
    ON CONFLICT(id) DO UPDATE SET
      loja_id         = CASE WHEN deleted_locally = 1 THEN loja_id         ELSE excluded.loja_id         END,
      loja_nome       = CASE WHEN deleted_locally = 1 THEN loja_nome       ELSE excluded.loja_nome       END,
      consumidor_id   = CASE WHEN deleted_locally = 1 THEN consumidor_id   ELSE excluded.consumidor_id   END,
      consumidor_nome = CASE WHEN deleted_locally = 1 THEN consumidor_nome ELSE excluded.consumidor_nome END,
      nota            = CASE WHEN deleted_locally = 1 THEN nota            ELSE excluded.nota            END,
      comentario      = CASE WHEN deleted_locally = 1 THEN comentario      ELSE excluded.comentario      END,
      data_avaliacao  = CASE WHEN deleted_locally = 1 THEN data_avaliacao  ELSE excluded.data_avaliacao  END,
      synced_at       = CASE WHEN deleted_locally = 1 THEN synced_at       ELSE excluded.synced_at       END
  `).run(row)
}

function listarAvaliacoesPorLoja(lojaId) {
  return db.prepare('SELECT id FROM avaliacoes WHERE loja_id = ? AND deleted_locally = 0').all(lojaId)
}

function marcarAvaliacaoExcluida(id) {
  db.prepare('UPDATE avaliacoes SET deleted_locally = 1 WHERE id = ?').run(id)
}

function removerAvaliacao(id) {
  db.prepare('DELETE FROM avaliacoes WHERE id = ?').run(id)
}

// ─── Consumidores ──────────────────────────────────────────────────────────

function listarConsumidores() {
  return db.prepare('SELECT * FROM consumidores WHERE deleted_locally = 0 ORDER BY nome').all().map(rowToConsumidor)
}

function upsertConsumidor(consumidor) {
  const row = consumidorToRow(consumidor)
  db.prepare(`
    INSERT INTO consumidores (id, nome, email, cpf, celular, synced_at, deleted_locally)
    VALUES (@id, @nome, @email, @cpf, @celular, @synced_at, 0)
    ON CONFLICT(id) DO UPDATE SET
      nome            = excluded.nome,
      email           = excluded.email,
      cpf             = excluded.cpf,
      celular         = excluded.celular,
      synced_at       = excluded.synced_at,
      deleted_locally = 0
  `).run(row)
}

function marcarConsumidorExcluido(id) {
  db.prepare('UPDATE consumidores SET deleted_locally = 1 WHERE id = ?').run(id)
}

function removerConsumidor(id) {
  db.prepare('DELETE FROM consumidores WHERE id = ?').run(id)
}

// ─── Comerciantes ──────────────────────────────────────────────────────────

function listarComerciantes() {
  return db.prepare('SELECT * FROM comerciantes WHERE deleted_locally = 0 ORDER BY nome').all().map(rowToComerciante)
}

function upsertComerciante(comerciante) {
  const row = comercianteToRow(comerciante)
  if (!row.id_comerciante) {
    console.warn('[database] upsertComerciante ignorado: id_comerciante nulo', comerciante)
    return
  }
  db.prepare(`
    INSERT INTO comerciantes (id_comerciante, nome, email, synced_at, deleted_locally)
    VALUES (@id_comerciante, @nome, @email, @synced_at, 0)
    ON CONFLICT(id_comerciante) DO UPDATE SET
      nome            = excluded.nome,
      email           = excluded.email,
      synced_at       = excluded.synced_at,
      deleted_locally = CASE WHEN deleted_locally = 1 THEN 1 ELSE 0 END
  `).run(row)
}

function marcarComercianteExcluido(id) {
  db.prepare('UPDATE comerciantes SET deleted_locally = 1 WHERE id_comerciante = ?').run(id)
}

function removerComerciante(id) {
  db.prepare('DELETE FROM comerciantes WHERE id_comerciante = ?').run(id)
}

function listarLojasDoComerciante(comercianteId) {
  return db.prepare('SELECT * FROM lojas WHERE comerciante_id = ? AND deleted_locally = 0').all(comercianteId).map(rowToLoja)
}

function removerLoja(id) {
  db.prepare('DELETE FROM lojas WHERE id = ?').run(id)
}

// ─── Pending Ops ───────────────────────────────────────────────────────────

function addPendingOp(entity, entityId, operation, payload) {
  db.prepare(`
    INSERT INTO pending_ops (entity, entity_id, operation, payload)
    VALUES (?, ?, ?, ?)
  `).run(entity, entityId, operation, payload ? JSON.stringify(payload) : null)
}

function getPendingOps() {
  return db.prepare('SELECT * FROM pending_ops ORDER BY created_at').all().map(row => ({
    ...row,
    payload: row.payload ? JSON.parse(row.payload) : null,
  }))
}

function removePendingOp(id) {
  db.prepare('DELETE FROM pending_ops WHERE id = ?').run(id)
}

function incrementPendingOpRetry(id, errorMsg) {
  db.prepare('UPDATE pending_ops SET retries = retries + 1, last_error = ? WHERE id = ?').run(errorMsg, id)
}

// ─── Dashboard Stats ───────────────────────────────────────────────────────

function getDashboardStats() {
  const totalLojas = db.prepare('SELECT COUNT(*) as c FROM lojas WHERE deleted_locally = 0').get().c
  const lojasAtivas = db.prepare("SELECT COUNT(*) as c FROM lojas WHERE status_loja = 'ATIVA' AND deleted_locally = 0").get().c
  const totalConsumidores = db.prepare('SELECT COUNT(*) as c FROM consumidores WHERE deleted_locally = 0').get().c
  const totalComerciantes = db.prepare('SELECT COUNT(*) as c FROM comerciantes WHERE deleted_locally = 0').get().c
  const denunciasPendentes = db.prepare("SELECT COUNT(*) as c FROM denuncias WHERE status_denuncia = 'PENDENTE'").get().c
  const totalAvaliacoes = db.prepare('SELECT COUNT(*) as c FROM avaliacoes WHERE deleted_locally = 0').get().c
  const denunciasRecentes = db.prepare('SELECT * FROM denuncias ORDER BY data_denuncia DESC LIMIT 5').all().map(rowToDenuncia)

  return { totalLojas, lojasAtivas, totalConsumidores, totalComerciantes, denunciasPendentes, totalAvaliacoes, denunciasRecentes }
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  initialize,
  get,
  set,
  listarLojas, upsertLoja, atualizarLoja, marcarLojaSync, marcarLojaExcluida,
  listarDenuncias, upsertDenuncia, atualizarDenuncia, marcarDenunciaSync,
  listarAvaliacoes, listarAvaliacoesPorLoja, upsertAvaliacao, marcarAvaliacaoExcluida, removerAvaliacao,
  listarConsumidores, upsertConsumidor, marcarConsumidorExcluido, removerConsumidor,
  listarComerciantes, upsertComerciante, marcarComercianteExcluido, removerComerciante,
  listarLojasDoComerciante, removerLoja,
  addPendingOp, getPendingOps, removePendingOp, incrementPendingOpRetry,
  getDashboardStats,
}