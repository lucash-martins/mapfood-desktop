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

function parseGaleria(val) {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
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
    imagem_url: loja.imagemUrl ?? null,
    galeria: Array.isArray(loja.galeria) ? JSON.stringify(loja.galeria) : null,
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
    imagemUrl: row.imagem_url,
    galeria: parseGaleria(row.galeria),
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
    motivo: d.motivo ?? null,
    descricao: d.descricao ?? null,
    status_denuncia: d.statusDenuncia ?? null,
    data_denuncia: normalizarData(d.dataDenuncia),
    // Campos de risco sanitário e do contraditório do comerciante
    data_consumo: d.dataConsumo ?? null,
    item_consumido: d.itemConsumido ?? null,
    foto_url: d.fotoUrl ?? null,
    resposta_comerciante: d.respostaComerciante ?? null,
    data_resposta: normalizarData(d.dataResposta),
    prazo_resposta: normalizarData(d.prazoResposta),
    synced_at: new Date().toISOString(),
  }
}

function rowToDenuncia(row) {
  return {
    id: row.id,
    lojaId: row.loja_id,
    loja: { id: row.loja_id, nome: row.loja_nome },
    consumidor: { id: row.consumidor_id, nome: row.consumidor_nome },
    motivo: row.motivo,
    descricao: row.descricao,
    statusDenuncia: row.status_denuncia,
    dataDenuncia: row.data_denuncia,
    dataConsumo: row.data_consumo,
    itemConsumido: row.item_consumido,
    fotoUrl: row.foto_url,
    respostaComerciante: row.resposta_comerciante,
    dataResposta: row.data_resposta,
    prazoResposta: row.prazo_resposta,
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
    dirty: !!row.dirty,
  }
}

function consumidorToRow(c) {
  return {
    id: c.id,
    nome: c.nome ?? null,
    email: c.email ?? null,
    cpf: c.cpf ?? null,
    celular: c.celular ?? null,
    imagem_url: c.imagemUrl ?? null,
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
    imagemUrl: row.imagem_url,
    syncedAt: row.synced_at,
    dirty: !!row.dirty,
  }
}

function comercianteToRow(c) {
  return {
    // Tenta id_comerciante, idComerciante, idUsuario (PK unificada), id — nesta ordem
    id_comerciante: c.id_comerciante ?? c.idComerciante ?? c.idUsuario ?? c.id ?? null,
    nome: c.nome ?? null,
    email: c.email ?? null,
    cpf: c.cpf ?? null,
    celular: c.celular ?? null,
    telefone: c.telefone ?? null,
    cnpj: c.cnpj ?? null,
    dashboard_enabled: c.dashboardEnabled ? 1 : 0,
    imagem_url: c.imagemUrl ?? null,
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
    cpf: row.cpf,
    celular: row.celular,
    telefone: row.telefone,
    cnpj: row.cnpj,
    dashboardEnabled: !!row.dashboard_enabled,
    imagemUrl: row.imagem_url,
    syncedAt: row.synced_at,
    dirty: !!row.dirty,
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
  imagem_url       TEXT,
  galeria          TEXT,
  synced_at        TEXT,
  dirty            INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS denuncias (
  id               INTEGER PRIMARY KEY,
  loja_id          INTEGER,
  loja_nome        TEXT,
  consumidor_id    INTEGER,
  consumidor_nome  TEXT,
  motivo           TEXT,
  descricao        TEXT,
  status_denuncia  TEXT,
  data_denuncia    TEXT,
  data_consumo         TEXT,
  item_consumido       TEXT,
  foto_url             TEXT,
  resposta_comerciante TEXT,
  data_resposta        TEXT,
  prazo_resposta       TEXT,
  synced_at        TEXT,
  dirty            INTEGER DEFAULT 0,
  deleted_locally  INTEGER DEFAULT 0
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
  imagem_url       TEXT,
  synced_at        TEXT,
  deleted_locally  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS comerciantes (
  id_comerciante   INTEGER PRIMARY KEY,
  nome             TEXT,
  email            TEXT,
  dashboard_enabled INTEGER DEFAULT 0,
  imagem_url       TEXT,
  synced_at        TEXT,
  dirty            INTEGER DEFAULT 0,
  deleted_locally  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS posts (
  id                INTEGER PRIMARY KEY,
  comerciante_id    INTEGER,
  comerciante_nome  TEXT,
  titulo            TEXT,
  conteudo          TEXT,
  galeria           TEXT,
  tipo              TEXT,
  data_publicacao   TEXT,
  total_curtidas    INTEGER DEFAULT 0,
  total_comentarios INTEGER DEFAULT 0,
  synced_at         TEXT
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
  if (v < 2) {
    try { db.prepare('ALTER TABLE denuncias ADD COLUMN deleted_locally INTEGER DEFAULT 0').run() } catch (_) {}
    db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (2)').run()
    console.log('[database] Migration v2: denuncias.deleted_locally')
  }
  // v2 usava try/catch que podia marcar a migração como feita sem criar a coluna.
  // v3 verifica via PRAGMA antes de inserir, garantindo idempotência real.
  const hasDenunciaDeletedLocally = db.prepare("PRAGMA table_info(denuncias)").all().some(r => r.name === 'deleted_locally')
  if (!hasDenunciaDeletedLocally) {
    db.prepare('ALTER TABLE denuncias ADD COLUMN deleted_locally INTEGER DEFAULT 0').run()
    db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (3)').run()
    console.log('[database] Migration v3: denuncias.deleted_locally (correção)')
  }

  const comerciantesCols = db.prepare("PRAGMA table_info(comerciantes)").all().map(r => r.name)
  if (!comerciantesCols.includes('dashboard_enabled')) {
    db.prepare('ALTER TABLE comerciantes ADD COLUMN dashboard_enabled INTEGER DEFAULT 0').run()
    console.log('[database] Migration v4: comerciantes.dashboard_enabled')
  }
  if (!comerciantesCols.includes('dirty')) {
    db.prepare('ALTER TABLE comerciantes ADD COLUMN dirty INTEGER DEFAULT 0').run()
    console.log('[database] Migration v4: comerciantes.dirty')
  }
  if (!comerciantesCols.includes('dashboard_enabled') || !comerciantesCols.includes('dirty')) {
    db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (4)').run()
  }

  const lojasCols = db.prepare("PRAGMA table_info(lojas)").all().map(r => r.name)
  if (!lojasCols.includes('imagem_url')) {
    db.prepare('ALTER TABLE lojas ADD COLUMN imagem_url TEXT').run()
    console.log('[database] Migration v5: lojas.imagem_url')
  }
  const consumidoresCols = db.prepare("PRAGMA table_info(consumidores)").all().map(r => r.name)
  if (!consumidoresCols.includes('imagem_url')) {
    db.prepare('ALTER TABLE consumidores ADD COLUMN imagem_url TEXT').run()
    console.log('[database] Migration v5: consumidores.imagem_url')
  }
  if (!comerciantesCols.includes('imagem_url')) {
    db.prepare('ALTER TABLE comerciantes ADD COLUMN imagem_url TEXT').run()
    console.log('[database] Migration v5: comerciantes.imagem_url')
  }
  if (!lojasCols.includes('imagem_url') || !consumidoresCols.includes('imagem_url') || !comerciantesCols.includes('imagem_url')) {
    db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (5)').run()
  }

  if (!lojasCols.includes('galeria')) {
    db.prepare('ALTER TABLE lojas ADD COLUMN galeria TEXT').run()
    db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (6)').run()
    console.log('[database] Migration v6: lojas.galeria')
  }

  const avaliacoesCols = db.prepare("PRAGMA table_info(avaliacoes)").all().map(r => r.name)
  let v7Aplicada = false
  if (!avaliacoesCols.includes('dirty')) {
    db.prepare('ALTER TABLE avaliacoes ADD COLUMN dirty INTEGER DEFAULT 0').run()
    console.log('[database] Migration v7: avaliacoes.dirty')
    v7Aplicada = true
  }
  if (!consumidoresCols.includes('dirty')) {
    db.prepare('ALTER TABLE consumidores ADD COLUMN dirty INTEGER DEFAULT 0').run()
    console.log('[database] Migration v7: consumidores.dirty')
    v7Aplicada = true
  }
  if (!comerciantesCols.includes('cpf')) {
    db.prepare('ALTER TABLE comerciantes ADD COLUMN cpf TEXT').run()
    console.log('[database] Migration v7: comerciantes.cpf')
    v7Aplicada = true
  }
  if (!comerciantesCols.includes('celular')) {
    db.prepare('ALTER TABLE comerciantes ADD COLUMN celular TEXT').run()
    console.log('[database] Migration v7: comerciantes.celular')
    v7Aplicada = true
  }
  if (!comerciantesCols.includes('telefone')) {
    db.prepare('ALTER TABLE comerciantes ADD COLUMN telefone TEXT').run()
    console.log('[database] Migration v7: comerciantes.telefone')
    v7Aplicada = true
  }
  if (!comerciantesCols.includes('cnpj')) {
    db.prepare('ALTER TABLE comerciantes ADD COLUMN cnpj TEXT').run()
    console.log('[database] Migration v7: comerciantes.cnpj')
    v7Aplicada = true
  }
  if (v7Aplicada) {
    db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (7)').run()
  }

  const denunciasCols = db.prepare("PRAGMA table_info(denuncias)").all().map(r => r.name)
  if (!denunciasCols.includes('motivo')) {
    db.prepare('ALTER TABLE denuncias ADD COLUMN motivo TEXT').run()
    db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (8)').run()
    console.log('[database] Migration v8: denuncias.motivo')
  }

  const postsCols = db.prepare("PRAGMA table_info(posts)").all().map(r => r.name)
  let v9Aplicada = false
  if (!postsCols.includes('conteudo')) {
    db.prepare('ALTER TABLE posts ADD COLUMN conteudo TEXT').run()
    console.log('[database] Migration v9: posts.conteudo')
    v9Aplicada = true
  }
  if (!postsCols.includes('galeria')) {
    db.prepare('ALTER TABLE posts ADD COLUMN galeria TEXT').run()
    console.log('[database] Migration v9: posts.galeria')
    v9Aplicada = true
  }
  if (v9Aplicada) {
    db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (9)').run()
  }

  // v10: campos de risco sanitário e do contraditório do comerciante nas denúncias
  const denunciasColsV10 = db.prepare("PRAGMA table_info(denuncias)").all().map(r => r.name)
  const novasColunas = [
    'data_consumo',
    'item_consumido',
    'foto_url',
    'resposta_comerciante',
    'data_resposta',
    'prazo_resposta',
  ]
  let v10Aplicada = false
  for (const coluna of novasColunas) {
    if (!denunciasColsV10.includes(coluna)) {
      db.prepare(`ALTER TABLE denuncias ADD COLUMN ${coluna} TEXT`).run()
      console.log(`[database] Migration v10: denuncias.${coluna}`)
      v10Aplicada = true
    }
  }
  if (v10Aplicada) {
    db.prepare('INSERT OR IGNORE INTO schema_version (version) VALUES (10)').run()
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
    INSERT INTO lojas (id, nome, descricao, status_loja, data_cadastro, comerciante_id, comerciante_nome, imagem_url, galeria, synced_at, dirty)
    VALUES (@id, @nome, @descricao, @status_loja, @data_cadastro, @comerciante_id, @comerciante_nome, @imagem_url, @galeria, @synced_at, 0)
    ON CONFLICT(id) DO UPDATE SET
      nome             = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN nome             ELSE excluded.nome             END,
      descricao        = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN descricao        ELSE excluded.descricao        END,
      status_loja      = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN status_loja      ELSE excluded.status_loja      END,
      data_cadastro    = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN data_cadastro    ELSE excluded.data_cadastro    END,
      comerciante_id   = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN comerciante_id   ELSE excluded.comerciante_id   END,
      comerciante_nome = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN comerciante_nome ELSE excluded.comerciante_nome END,
      imagem_url       = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN imagem_url       ELSE excluded.imagem_url       END,
      galeria          = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN galeria          ELSE excluded.galeria          END,
      synced_at        = CASE WHEN dirty = 1 OR deleted_locally = 1 THEN synced_at        ELSE excluded.synced_at        END,
      deleted_locally  = CASE WHEN deleted_locally = 1 THEN 1 ELSE 0 END
  `).run(row)
}

function marcarLojaExcluida(id) {
  db.prepare('UPDATE lojas SET deleted_locally = 1 WHERE id = ?').run(id)
}

function listarTodasLojas() {
  return db.prepare('SELECT id, dirty FROM lojas').all()
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
  return db.prepare(`
    SELECT
      d.id,
      d.loja_id,
      COALESCE(d.loja_nome, l.nome) AS loja_nome,
      d.consumidor_id,
      d.consumidor_nome,
      d.motivo,
      d.descricao,
      d.status_denuncia,
      d.data_denuncia,
      d.data_consumo,
      d.item_consumido,
      d.foto_url,
      d.resposta_comerciante,
      d.data_resposta,
      d.prazo_resposta,
      d.synced_at,
      d.dirty,
      d.deleted_locally
    FROM denuncias d
    LEFT JOIN lojas l ON d.loja_id = l.id AND l.deleted_locally = 0
    WHERE d.deleted_locally = 0
    ORDER BY d.data_denuncia DESC
  `).all().map(rowToDenuncia)
}

function listarTodasDenuncias() {
  return db.prepare('SELECT id, dirty FROM denuncias').all()
}

function upsertDenuncia(denuncia) {
  const row = denunciaToRow(denuncia)
  db.prepare(`
    INSERT INTO denuncias (id, loja_id, loja_nome, consumidor_id, consumidor_nome, motivo, descricao, status_denuncia, data_denuncia, data_consumo, item_consumido, foto_url, resposta_comerciante, data_resposta, prazo_resposta, synced_at, dirty)
    VALUES (@id, @loja_id, @loja_nome, @consumidor_id, @consumidor_nome, @motivo, @descricao, @status_denuncia, @data_denuncia, @data_consumo, @item_consumido, @foto_url, @resposta_comerciante, @data_resposta, @prazo_resposta, @synced_at, 0)
    ON CONFLICT(id) DO UPDATE SET
      loja_id         = CASE WHEN dirty = 1 THEN loja_id         ELSE excluded.loja_id         END,
      loja_nome       = CASE WHEN dirty = 1 THEN loja_nome       ELSE excluded.loja_nome       END,
      consumidor_id   = CASE WHEN dirty = 1 THEN consumidor_id   ELSE excluded.consumidor_id   END,
      consumidor_nome = CASE WHEN dirty = 1 THEN consumidor_nome ELSE excluded.consumidor_nome END,
      motivo          = CASE WHEN dirty = 1 THEN motivo          ELSE excluded.motivo          END,
      descricao       = CASE WHEN dirty = 1 THEN descricao       ELSE excluded.descricao       END,
      status_denuncia = CASE WHEN dirty = 1 THEN status_denuncia ELSE excluded.status_denuncia END,
      data_denuncia   = CASE WHEN dirty = 1 THEN data_denuncia   ELSE excluded.data_denuncia   END,
      data_consumo         = CASE WHEN dirty = 1 THEN data_consumo         ELSE excluded.data_consumo         END,
      item_consumido       = CASE WHEN dirty = 1 THEN item_consumido       ELSE excluded.item_consumido       END,
      foto_url             = CASE WHEN dirty = 1 THEN foto_url             ELSE excluded.foto_url             END,
      resposta_comerciante = CASE WHEN dirty = 1 THEN resposta_comerciante ELSE excluded.resposta_comerciante END,
      data_resposta        = CASE WHEN dirty = 1 THEN data_resposta        ELSE excluded.data_resposta        END,
      prazo_resposta       = CASE WHEN dirty = 1 THEN prazo_resposta       ELSE excluded.prazo_resposta       END,
      synced_at       = CASE WHEN dirty = 1 THEN synced_at       ELSE excluded.synced_at       END,
      deleted_locally = 0
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
      consumidor_nome=@consumidor_nome, motivo=@motivo, descricao=@descricao,
      status_denuncia=@status_denuncia, data_denuncia=@data_denuncia,
      data_consumo=@data_consumo, item_consumido=@item_consumido, foto_url=@foto_url,
      resposta_comerciante=@resposta_comerciante, data_resposta=@data_resposta,
      prazo_resposta=@prazo_resposta, dirty=@dirty
    WHERE id=@id
  `).run(merged)
  return rowToDenuncia(db.prepare('SELECT * FROM denuncias WHERE id = ?').get(id))
}

function marcarDenunciaSync(id) {
  db.prepare('UPDATE denuncias SET dirty = 0 WHERE id = ?').run(id)
}

function marcarDenunciaExcluida(id) {
  db.prepare('UPDATE denuncias SET deleted_locally = 1 WHERE id = ?').run(id)
}

function removerDenuncia(id) {
  db.prepare('DELETE FROM denuncias WHERE id = ?').run(id)
}

// ─── Avaliacoes ────────────────────────────────────────────────────────────

function listarAvaliacoes() {
  return db.prepare(`
    SELECT
      a.id,
      a.loja_id,
      COALESCE(a.loja_nome, l.nome) AS loja_nome,
      a.consumidor_id,
      a.consumidor_nome,
      a.nota,
      a.comentario,
      a.data_avaliacao,
      a.synced_at,
      a.deleted_locally
    FROM avaliacoes a
    LEFT JOIN lojas l ON a.loja_id = l.id AND l.deleted_locally = 0
    WHERE a.deleted_locally = 0
    ORDER BY a.data_avaliacao DESC
  `).all().map(rowToAvaliacao)
}

function upsertAvaliacao(avaliacao) {
  const row = avaliacaoToRow(avaliacao)
  db.prepare(`
    INSERT INTO avaliacoes (id, loja_id, loja_nome, consumidor_id, consumidor_nome, nota, comentario, data_avaliacao, synced_at, dirty, deleted_locally)
    VALUES (@id, @loja_id, @loja_nome, @consumidor_id, @consumidor_nome, @nota, @comentario, @data_avaliacao, @synced_at, 0, 0)
    ON CONFLICT(id) DO UPDATE SET
      loja_id         = CASE WHEN dirty = 1 THEN loja_id         ELSE excluded.loja_id         END,
      loja_nome       = CASE WHEN dirty = 1 THEN loja_nome       ELSE excluded.loja_nome       END,
      consumidor_id   = CASE WHEN dirty = 1 THEN consumidor_id   ELSE excluded.consumidor_id   END,
      consumidor_nome = CASE WHEN dirty = 1 THEN consumidor_nome ELSE excluded.consumidor_nome END,
      nota            = CASE WHEN dirty = 1 THEN nota            ELSE excluded.nota            END,
      comentario      = CASE WHEN dirty = 1 THEN comentario      ELSE excluded.comentario      END,
      data_avaliacao  = CASE WHEN dirty = 1 THEN data_avaliacao  ELSE excluded.data_avaliacao  END,
      synced_at       = CASE WHEN dirty = 1 THEN synced_at       ELSE excluded.synced_at       END,
      deleted_locally = 0
  `).run(row)
}

function atualizarAvaliacao(id, data) {
  const existing = db.prepare('SELECT * FROM avaliacoes WHERE id = ?').get(id)
  if (!existing) throw new Error(`Avaliacao ${id} nao encontrada`)
  const merged = {
    ...avaliacaoToRow({ ...rowToAvaliacao(existing), ...data }),
    dirty: 1,
    id,
  }
  db.prepare(`
    UPDATE avaliacoes SET nota=@nota, comentario=@comentario, dirty=@dirty
    WHERE id=@id
  `).run(merged)
  return rowToAvaliacao(db.prepare('SELECT * FROM avaliacoes WHERE id = ?').get(id))
}

function marcarAvaliacaoSync(id) {
  db.prepare('UPDATE avaliacoes SET dirty = 0 WHERE id = ?').run(id)
}

function listarAvaliacoesPorLoja(lojaId) {
  return db.prepare('SELECT id FROM avaliacoes WHERE loja_id = ? AND deleted_locally = 0').all(lojaId)
}

function listarTodasAvaliacoes() {
  return db.prepare('SELECT id, dirty FROM avaliacoes').all()
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

function listarTodosConsumidores() {
  return db.prepare('SELECT id, dirty FROM consumidores').all()
}

function upsertConsumidor(consumidor) {
  const row = consumidorToRow(consumidor)
  db.prepare(`
    INSERT INTO consumidores (id, nome, email, cpf, celular, imagem_url, synced_at, dirty, deleted_locally)
    VALUES (@id, @nome, @email, @cpf, @celular, @imagem_url, @synced_at, 0, 0)
    ON CONFLICT(id) DO UPDATE SET
      nome            = CASE WHEN dirty = 1 THEN nome            ELSE excluded.nome            END,
      email           = CASE WHEN dirty = 1 THEN email           ELSE excluded.email           END,
      cpf             = CASE WHEN dirty = 1 THEN cpf             ELSE excluded.cpf             END,
      celular         = CASE WHEN dirty = 1 THEN celular         ELSE excluded.celular         END,
      imagem_url      = CASE WHEN dirty = 1 THEN imagem_url      ELSE excluded.imagem_url      END,
      synced_at       = CASE WHEN dirty = 1 THEN synced_at       ELSE excluded.synced_at       END,
      deleted_locally = 0
  `).run(row)
}

function atualizarConsumidor(id, data) {
  const existing = db.prepare('SELECT * FROM consumidores WHERE id = ?').get(id)
  if (!existing) throw new Error(`Consumidor ${id} nao encontrado`)
  const merged = {
    ...consumidorToRow({ ...rowToConsumidor(existing), ...data }),
    dirty: 1,
    id,
  }
  db.prepare(`
    UPDATE consumidores SET nome=@nome, email=@email, cpf=@cpf, celular=@celular, dirty=@dirty
    WHERE id=@id
  `).run(merged)
  return rowToConsumidor(db.prepare('SELECT * FROM consumidores WHERE id = ?').get(id))
}

function marcarConsumidorSync(id) {
  db.prepare('UPDATE consumidores SET dirty = 0 WHERE id = ?').run(id)
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

function listarTodosComerciantes() {
  return db.prepare('SELECT id_comerciante AS id, dirty FROM comerciantes').all()
}

function upsertComerciante(comerciante) {
  const row = comercianteToRow(comerciante)
  if (!row.id_comerciante) {
    console.warn('[database] upsertComerciante ignorado: id_comerciante nulo', comerciante)
    return
  }
  db.prepare(`
    INSERT INTO comerciantes (id_comerciante, nome, email, cpf, celular, telefone, cnpj, dashboard_enabled, imagem_url, synced_at, dirty, deleted_locally)
    VALUES (@id_comerciante, @nome, @email, @cpf, @celular, @telefone, @cnpj, @dashboard_enabled, @imagem_url, @synced_at, 0, 0)
    ON CONFLICT(id_comerciante) DO UPDATE SET
      nome              = CASE WHEN dirty = 1 THEN nome              ELSE excluded.nome              END,
      email             = CASE WHEN dirty = 1 THEN email             ELSE excluded.email             END,
      cpf               = CASE WHEN dirty = 1 THEN cpf               ELSE excluded.cpf               END,
      celular           = CASE WHEN dirty = 1 THEN celular           ELSE excluded.celular           END,
      telefone          = CASE WHEN dirty = 1 THEN telefone          ELSE excluded.telefone          END,
      cnpj              = CASE WHEN dirty = 1 THEN cnpj              ELSE excluded.cnpj              END,
      dashboard_enabled = CASE WHEN dirty = 1 THEN dashboard_enabled ELSE excluded.dashboard_enabled END,
      imagem_url        = CASE WHEN dirty = 1 THEN imagem_url        ELSE excluded.imagem_url        END,
      synced_at         = CASE WHEN dirty = 1 THEN synced_at         ELSE excluded.synced_at         END,
      deleted_locally   = 0
  `).run(row)
}

function marcarComercianteExcluido(id) {
  db.prepare('UPDATE comerciantes SET deleted_locally = 1 WHERE id_comerciante = ?').run(id)
}

function removerComerciante(id) {
  db.prepare('DELETE FROM comerciantes WHERE id_comerciante = ?').run(id)
}

function atualizarComerciante(id, data) {
  const existing = db.prepare('SELECT * FROM comerciantes WHERE id_comerciante = ?').get(id)
  if (!existing) throw new Error(`Comerciante ${id} nao encontrado`)
  const merged = {
    ...comercianteToRow({ ...rowToComerciante(existing), ...data }),
    dirty: 1,
    id_comerciante: id,
  }
  db.prepare(`
    UPDATE comerciantes SET
      nome=@nome, email=@email, cpf=@cpf, celular=@celular, telefone=@telefone, cnpj=@cnpj, dirty=@dirty
    WHERE id_comerciante=@id_comerciante
  `).run(merged)
  return rowToComerciante(db.prepare('SELECT * FROM comerciantes WHERE id_comerciante = ?').get(id))
}

function atualizarComercianteDashboard(id, enabled) {
  const existing = db.prepare('SELECT * FROM comerciantes WHERE id_comerciante = ?').get(id)
  if (!existing) throw new Error(`Comerciante ${id} nao encontrado`)
  db.prepare('UPDATE comerciantes SET dashboard_enabled = ?, dirty = 1 WHERE id_comerciante = ?').run(enabled ? 1 : 0, id)
  return rowToComerciante(db.prepare('SELECT * FROM comerciantes WHERE id_comerciante = ?').get(id))
}

function marcarComercianteSync(id) {
  db.prepare('UPDATE comerciantes SET dirty = 0 WHERE id_comerciante = ?').run(id)
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

// ─── Cascade helpers ───────────────────────────────────────────────────────

// Retorna { avaliacoes: number, denuncias: number } para um consumidor
function verificarDadosConsumidor(consumidorId) {
  const avaliacoes = db.prepare('SELECT COUNT(*) as n FROM avaliacoes WHERE consumidor_id = ? AND deleted_locally = 0').get(consumidorId)?.n ?? 0
  const denuncias  = db.prepare('SELECT COUNT(*) as n FROM denuncias  WHERE consumidor_id = ? AND deleted_locally = 0').get(consumidorId)?.n ?? 0
  return { avaliacoes, denuncias }
}

// Retorna ids de avaliacoes e denuncias vinculadas ao consumidor
function getDadosConsumidor(consumidorId) {
  const avaliacoes = db.prepare('SELECT id FROM avaliacoes WHERE consumidor_id = ? AND deleted_locally = 0').all(consumidorId).map(r => r.id)
  const denuncias  = db.prepare('SELECT id FROM denuncias  WHERE consumidor_id = ? AND deleted_locally = 0').all(consumidorId).map(r => r.id)
  return { avaliacoes, denuncias }
}

// Retorna ids de denuncias vinculadas a uma loja
function getDenunciasPorLoja(lojaId) {
  return db.prepare('SELECT id FROM denuncias WHERE loja_id = ? AND deleted_locally = 0').all(lojaId).map(r => r.id)
}

// Retorna { lojas: number, avaliacoes: number, denuncias: number } para um comerciante
function verificarDadosComerciante(comercianteId) {
  const lojaIds = db.prepare('SELECT id FROM lojas WHERE comerciante_id = ? AND deleted_locally = 0').all(comercianteId).map(r => r.id)
  if (lojaIds.length === 0) return { lojas: 0, avaliacoes: 0, denuncias: 0 }
  const placeholders = lojaIds.map(() => '?').join(',')
  const avaliacoes = db.prepare(`SELECT COUNT(*) as n FROM avaliacoes WHERE loja_id IN (${placeholders}) AND deleted_locally = 0`).get(...lojaIds)?.n ?? 0
  const denuncias  = db.prepare(`SELECT COUNT(*) as n FROM denuncias  WHERE loja_id IN (${placeholders}) AND deleted_locally = 0`).get(...lojaIds)?.n ?? 0
  return { lojas: lojaIds.length, avaliacoes, denuncias }
}

// ─── Dashboard Stats ───────────────────────────────────────────────────────

function getDashboardStats() {
  const totalLojas = db.prepare('SELECT COUNT(*) as c FROM lojas WHERE deleted_locally = 0').get().c
  const lojasAtivas = db.prepare("SELECT COUNT(*) as c FROM lojas WHERE status_loja = 'ATIVA' AND deleted_locally = 0").get().c
  const totalConsumidores = db.prepare('SELECT COUNT(*) as c FROM consumidores WHERE deleted_locally = 0').get().c
  const totalComerciantes = db.prepare('SELECT COUNT(*) as c FROM comerciantes WHERE deleted_locally = 0').get().c
  const denunciasPendentes = db.prepare("SELECT COUNT(*) as c FROM denuncias WHERE status_denuncia = 'PENDENTE' AND deleted_locally = 0").get().c
  const totalAvaliacoes = db.prepare('SELECT COUNT(*) as c FROM avaliacoes WHERE deleted_locally = 0').get().c
  const denunciasRecentes = db.prepare('SELECT * FROM denuncias WHERE deleted_locally = 0 ORDER BY data_denuncia DESC LIMIT 5').all().map(rowToDenuncia)

  return { totalLojas, lojasAtivas, totalConsumidores, totalComerciantes, denunciasPendentes, totalAvaliacoes, denunciasRecentes }
}

// ─── Posts (blog) ──────────────────────────────────────────────────────────
// Espelho somente-leitura do blog — o Desktop nunca cria/edita posts, só usa
// os dados pra contabilização nos Relatórios, então não precisa de dirty/pending_ops.

function upsertPost(post) {
  const id = post.id ?? null
  if (!id) {
    console.warn('[database] upsertPost ignorado: id nulo', post)
    return
  }
  const row = {
    id,
    comerciante_id: post.comercianteId ?? null,
    comerciante_nome: post.comercianteNome ?? null,
    titulo: post.titulo ?? null,
    conteudo: post.conteudo ?? null,
    galeria: Array.isArray(post.galeria) ? JSON.stringify(post.galeria) : null,
    tipo: post.tipo ?? null,
    data_publicacao: post.dataPublicacao ?? null,
    total_curtidas: post.totalCurtidas ?? 0,
    total_comentarios: post.totalComentarios ?? 0,
    synced_at: new Date().toISOString(),
  }
  db.prepare(`
    INSERT INTO posts (id, comerciante_id, comerciante_nome, titulo, conteudo, galeria, tipo, data_publicacao, total_curtidas, total_comentarios, synced_at)
    VALUES (@id, @comerciante_id, @comerciante_nome, @titulo, @conteudo, @galeria, @tipo, @data_publicacao, @total_curtidas, @total_comentarios, @synced_at)
    ON CONFLICT(id) DO UPDATE SET
      comerciante_id    = excluded.comerciante_id,
      comerciante_nome  = excluded.comerciante_nome,
      titulo            = excluded.titulo,
      conteudo          = excluded.conteudo,
      galeria           = excluded.galeria,
      tipo              = excluded.tipo,
      data_publicacao   = excluded.data_publicacao,
      total_curtidas    = excluded.total_curtidas,
      total_comentarios = excluded.total_comentarios,
      synced_at         = excluded.synced_at
  `).run(row)
}

function listarTodosPosts() {
  return db.prepare('SELECT id FROM posts').all()
}

function removerPost(id) {
  db.prepare('DELETE FROM posts WHERE id = ?').run(id)
}

// ─── Relatorios ────────────────────────────────────────────────────────────

function getRelatorioStats() {
  const totalLojas = db.prepare('SELECT COUNT(*) as c FROM lojas WHERE deleted_locally = 0').get().c
  const totalConsumidores = db.prepare('SELECT COUNT(*) as c FROM consumidores WHERE deleted_locally = 0').get().c
  const totalComerciantes = db.prepare('SELECT COUNT(*) as c FROM comerciantes WHERE deleted_locally = 0').get().c
  const totalAvaliacoes = db.prepare('SELECT COUNT(*) as c FROM avaliacoes WHERE deleted_locally = 0').get().c
  const totalDenuncias = db.prepare('SELECT COUNT(*) as c FROM denuncias WHERE deleted_locally = 0').get().c
  const denunciasPendentes = db.prepare("SELECT COUNT(*) as c FROM denuncias WHERE status_denuncia = 'PENDENTE' AND deleted_locally = 0").get().c
  const notaMedia = db.prepare('SELECT AVG(nota) as m FROM avaliacoes WHERE deleted_locally = 0').get().m

  const lojasPorStatus = db.prepare(`
    SELECT COALESCE(status_loja, 'DESCONHECIDO') as status, COUNT(*) as total
    FROM lojas WHERE deleted_locally = 0
    GROUP BY status
  `).all()

  const distribuicaoNotas = db.prepare(`
    SELECT nota, COUNT(*) as total
    FROM avaliacoes WHERE deleted_locally = 0 AND nota IS NOT NULL
    GROUP BY nota
    ORDER BY nota
  `).all()

  const denunciasPorStatus = db.prepare(`
    SELECT COALESCE(status_denuncia, 'DESCONHECIDO') as status, COUNT(*) as total
    FROM denuncias WHERE deleted_locally = 0
    GROUP BY status
  `).all()

  const avaliacoesPorMes = db.prepare(`
    SELECT substr(data_avaliacao, 1, 7) as mes, AVG(nota) as media, COUNT(*) as total
    FROM avaliacoes
    WHERE deleted_locally = 0 AND data_avaliacao IS NOT NULL
    GROUP BY mes
    ORDER BY mes DESC
    LIMIT 12
  `).all().reverse()

  // Uma linha por loja com suas métricas agregadas, para a tabela de detalhamento.
  // Subqueries correlacionadas (em vez de JOIN) evitam o efeito cascata do produto
  // cartesiano entre avaliacoes e denuncias de uma mesma loja.
  const lojasDetalhe = db.prepare(`
    SELECT
      l.id,
      l.nome,
      l.status_loja,
      l.comerciante_nome,
      (SELECT COUNT(*) FROM avaliacoes a WHERE a.loja_id = l.id AND a.deleted_locally = 0) as total_avaliacoes,
      (SELECT AVG(nota) FROM avaliacoes a WHERE a.loja_id = l.id AND a.deleted_locally = 0) as media_nota,
      (SELECT COUNT(*) FROM denuncias d WHERE d.loja_id = l.id AND d.deleted_locally = 0) as total_denuncias,
      (SELECT COUNT(*) FROM denuncias d WHERE d.loja_id = l.id AND d.deleted_locally = 0 AND d.status_denuncia = 'PENDENTE') as denuncias_pendentes
    FROM lojas l
    WHERE l.deleted_locally = 0
    ORDER BY l.nome
  `).all()

  return {
    totalLojas,
    totalConsumidores,
    totalComerciantes,
    totalAvaliacoes,
    totalDenuncias,
    denunciasPendentes,
    notaMedia: notaMedia || 0,
    lojasPorStatus,
    distribuicaoNotas,
    denunciasPorStatus,
    avaliacoesPorMes,
    lojasDetalhe,
  }
}

// ─── Blog Stats ────────────────────────────────────────────────────────────

function getBlogStats() {
  const totalPosts = db.prepare('SELECT COUNT(*) as c FROM posts').get().c
  const totalCurtidas = db.prepare('SELECT COALESCE(SUM(total_curtidas), 0) as s FROM posts').get().s
  const totalComentarios = db.prepare('SELECT COALESCE(SUM(total_comentarios), 0) as s FROM posts').get().s

  const postsPorComerciante = db.prepare(`
    SELECT
      comerciante_id,
      comerciante_nome,
      COUNT(*) as total_posts,
      COALESCE(SUM(total_curtidas), 0) as total_curtidas,
      COALESCE(SUM(total_comentarios), 0) as total_comentarios
    FROM posts
    GROUP BY comerciante_id, comerciante_nome
    ORDER BY total_posts DESC
  `).all()

  const rankingPosts = db.prepare(`
    SELECT
      id, titulo, comerciante_nome, tipo, data_publicacao, total_curtidas, total_comentarios,
      (total_curtidas + total_comentarios) as engajamento
    FROM posts
    ORDER BY engajamento DESC, data_publicacao DESC
    LIMIT 10
  `).all()

  // Lista completa, usada na tabela pesquisável/ordenável da página de Blog.
  // Inclui conteúdo e galeria para permitir revisar o post inteiro em caso de denúncia.
  const postsDetalhe = db.prepare(`
    SELECT id, titulo, conteudo, galeria, comerciante_nome, tipo, data_publicacao, total_curtidas, total_comentarios
    FROM posts
    ORDER BY data_publicacao DESC
  `).all().map(p => ({ ...p, galeria: parseGaleria(p.galeria) }))

  return {
    totalPosts,
    totalCurtidas,
    totalComentarios,
    postsPorComerciante,
    rankingPosts,
    postsDetalhe,
  }
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  initialize,
  get,
  set,
  listarLojas, listarTodasLojas, upsertLoja, atualizarLoja, marcarLojaSync, marcarLojaExcluida,
  listarDenuncias, listarTodasDenuncias, upsertDenuncia, atualizarDenuncia, marcarDenunciaSync, marcarDenunciaExcluida, removerDenuncia,
  listarAvaliacoes, listarTodasAvaliacoes, listarAvaliacoesPorLoja, upsertAvaliacao, atualizarAvaliacao, marcarAvaliacaoSync, marcarAvaliacaoExcluida, removerAvaliacao,
  listarConsumidores, listarTodosConsumidores, upsertConsumidor, atualizarConsumidor, marcarConsumidorSync, marcarConsumidorExcluido, removerConsumidor,
  listarComerciantes, listarTodosComerciantes, upsertComerciante, marcarComercianteExcluido, removerComerciante,
  atualizarComerciante, atualizarComercianteDashboard, marcarComercianteSync,
  listarLojasDoComerciante, removerLoja,
  upsertPost, listarTodosPosts, removerPost,
  addPendingOp, getPendingOps, removePendingOp, incrementPendingOpRetry,
  getDashboardStats,
  getRelatorioStats,
  getBlogStats,
  verificarDadosConsumidor, getDadosConsumidor,
  getDenunciasPorLoja, verificarDadosComerciante,
}