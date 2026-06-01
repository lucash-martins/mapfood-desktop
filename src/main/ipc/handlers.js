
const { ipcMain } = require('electron')
const database = require('../services/database')
const syncService = require('../services/syncService')
const connectivityService = require('../services/connectivityService')

function registerHandlers(win) {
  // ── Auth ──────────────────────────────────────────────────────────────────

  ipcMain.handle('auth:salvar-token', (_e, token, nome) => {
    database.set('admin_token', token)
    database.set('admin_nome', nome)
  })

  ipcMain.handle('auth:get-token', () => database.get('admin_token'))
  ipcMain.handle('auth:get-nome', () => database.get('admin_nome'))

  ipcMain.handle('auth:limpar-token', () => {
    database.set('admin_token', null)
    database.set('admin_nome', null)
  })

  // ── DB: Lojas ─────────────────────────────────────────────────────────────

  ipcMain.handle('db:listar-lojas', () => database.listarLojas())

  ipcMain.handle('db:atualizar-loja', async (_e, id, data) => {
    const loja = database.atualizarLoja(id, data)
    database.addPendingOp('loja', id, 'update', loja)
    if (connectivityService.isOnline()) {
      syncService.syncCompleto(win).catch(() => {})
    }
    return loja
  })

  // ── DB: Denuncias ─────────────────────────────────────────────────────────

  ipcMain.handle('db:listar-denuncias', () => database.listarDenuncias())

  ipcMain.handle('db:atualizar-denuncia', async (_e, id, data) => {
    const denuncia = database.atualizarDenuncia(id, data)
    database.addPendingOp('denuncia', id, 'update', denuncia)
    if (connectivityService.isOnline()) {
      syncService.syncCompleto(win).catch(() => {})
    }
    return denuncia
  })

  // ── DB: Avaliacoes ────────────────────────────────────────────────────────

  ipcMain.handle('db:listar-avaliacoes', () => database.listarAvaliacoes())

  ipcMain.handle('db:deletar-avaliacao', async (_e, id) => {
    if (connectivityService.isOnline()) {
      const token = database.get('admin_token')
      if (token) {
        try {
          await syncService.eliminarEntidade('avaliacao', id, token)
          database.removerAvaliacao(id)
          return
        } catch (err) {
          if (err.status && err.status >= 400 && err.status < 500) throw err
          console.warn('[ipc] Delete remoto de avaliacao falhou, enfileirando:', err.message)
        }
      }
    }
    database.marcarAvaliacaoExcluida(id)
    database.addPendingOp('avaliacao', id, 'delete', null)
  })

  // ── DB: Consumidores ──────────────────────────────────────────────────────

  ipcMain.handle('db:listar-consumidores', () => database.listarConsumidores())

  ipcMain.handle('db:deletar-consumidor', async (_e, id) => {
    if (connectivityService.isOnline()) {
      const token = database.get('admin_token')
      if (token) {
        try {
          await syncService.eliminarEntidade('consumidor', id, token)
          database.removerConsumidor(id)
          return
        } catch (err) {
          if (err.status && err.status >= 400 && err.status < 500) throw err
          console.warn('[ipc] Delete remoto de consumidor falhou, enfileirando:', err.message)
        }
      }
    }
    database.marcarConsumidorExcluido(id)
    database.addPendingOp('consumidor', id, 'delete', null)
  })

  // ── DB: Comerciantes ──────────────────────────────────────────────────────

  ipcMain.handle('db:listar-comerciantes', () => database.listarComerciantes())

  ipcMain.handle('db:deletar-comerciante', async (_e, id) => {
    if (connectivityService.isOnline()) {
      const token = database.get('admin_token')
      if (token) {
        try {
          await syncService.eliminarEntidade('comerciante', id, token)
          database.removerComerciante(id)
          return
        } catch (err) {
          if (err.status && err.status >= 400 && err.status < 500) throw err
          console.warn('[ipc] Delete remoto de comerciante falhou, enfileirando:', err.message)
        }
      }
    }
    database.marcarComercianteExcluido(id)
    database.addPendingOp('comerciante', id, 'delete', null)
  })

  ipcMain.handle('db:deletar-comerciante-cascade', async (_e, id) => {
    const lojas = database.listarLojasDoComerciante(id)

    // Soft-delete local imediato e permanente — upsert do pull não restaura registros com deleted_locally=1
    for (const loja of lojas) {
      database.marcarLojaExcluida(loja.id)
      database.addPendingOp('loja', loja.id, 'delete', null)
    }
    database.marcarComercianteExcluido(id)
    database.addPendingOp('comerciante', id, 'delete', null)

    // Best-effort: tenta sincronizar com o backend (não trava se o backend rejeitar)
    if (connectivityService.isOnline()) {
      syncService.syncCompleto(win).catch(() => {})
    }
  })

  // ── DB: Dashboard ─────────────────────────────────────────────────────────

  ipcMain.handle('db:get-dashboard-stats', () => database.getDashboardStats())

  // ── Sync ──────────────────────────────────────────────────────────────────

  ipcMain.handle('sync:forcar', () => syncService.syncCompleto(win))
  ipcMain.handle('sync:get-ultima', () => database.get('ultima_sync'))

  // ── App ───────────────────────────────────────────────────────────────────

  ipcMain.handle('app:get-status-conexao', () => connectivityService.isOnline())
}

module.exports = { registerHandlers }
