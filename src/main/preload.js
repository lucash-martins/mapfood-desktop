const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  auth: {
    salvarToken: (token, nome) => ipcRenderer.invoke('auth:salvar-token', token, nome),
    getToken: () => ipcRenderer.invoke('auth:get-token'),
    getNome: () => ipcRenderer.invoke('auth:get-nome'),
    limparToken: () => ipcRenderer.invoke('auth:limpar-token'),
    onSessaoExpirada: (callback) => {
      const handler = () => callback()
      ipcRenderer.on('auth:sessao-expirada', handler)
      return () => ipcRenderer.removeListener('auth:sessao-expirada', handler)
    },
  },

  db: {
    listarLojas: () => ipcRenderer.invoke('db:listar-lojas'),
    atualizarLoja: (id, data) => ipcRenderer.invoke('db:atualizar-loja', id, data),
    listarDenuncias: () => ipcRenderer.invoke('db:listar-denuncias'),
    atualizarDenuncia: (id, data) => ipcRenderer.invoke('db:atualizar-denuncia', id, data),
    listarAvaliacoes: () => ipcRenderer.invoke('db:listar-avaliacoes'),
    deletarAvaliacao: (id) => ipcRenderer.invoke('db:deletar-avaliacao', id),
    listarConsumidores: () => ipcRenderer.invoke('db:listar-consumidores'),
    deletarConsumidor: (id) => ipcRenderer.invoke('db:deletar-consumidor', id),
    verificarDadosConsumidor: (id) => ipcRenderer.invoke('db:verificar-dados-consumidor', id),
    deletarConsumidorCascade: (id) => ipcRenderer.invoke('db:deletar-consumidor-cascade', id),
    listarComerciantes: () => ipcRenderer.invoke('db:listar-comerciantes'),
    deletarComerciante: (id) => ipcRenderer.invoke('db:deletar-comerciante', id),
    deletarComercianteCascade: (id) => ipcRenderer.invoke('db:deletar-comerciante-cascade', id),
    verificarDadosComerciante: (id) => ipcRenderer.invoke('db:verificar-dados-comerciante', id),
    getDashboardStats: () => ipcRenderer.invoke('db:get-dashboard-stats'),
  },

  sync: {
    forcarSync: () => ipcRenderer.invoke('sync:forcar'),
    getUltimaSync: () => ipcRenderer.invoke('sync:get-ultima'),
    onSyncStatus: (callback) => {
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('sync:status-changed', handler)
      return () => ipcRenderer.removeListener('sync:status-changed', handler)
    },
  },

  app: {
    getStatusConexao: () => ipcRenderer.invoke('app:get-status-conexao'),
    onStatusConexao: (callback) => {
      const handler = (_event, online) => callback(online)
      ipcRenderer.on('app:status-conexao-changed', handler)
      return () => ipcRenderer.removeListener('app:status-conexao-changed', handler)
    },
  },
})