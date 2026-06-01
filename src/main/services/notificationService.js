const { Notification } = require('electron')
const database = require('./database')

function verificarDenuncias(win) {
  try {
    const count = database.getDashboardStats().denunciasPendentes
    const ultimo = parseInt(database.get('ultimo_count_pendentes') || '0', 10)

    if (count > ultimo) {
      const novas = count - ultimo
      const notif = new Notification({
        title: 'MapFood Admin',
        body: `${novas} nova${novas > 1 ? 's' : ''} denúncia${novas > 1 ? 's' : ''} pendente${novas > 1 ? 's' : ''}`,
      })
      notif.on('click', () => {
        if (win) { win.show(); win.focus() }
      })
      notif.show()
    }

    database.set('ultimo_count_pendentes', String(count))
  } catch (err) {
    console.error('[notifications] Erro ao verificar denuncias:', err.message)
  }
}

module.exports = { verificarDenuncias }