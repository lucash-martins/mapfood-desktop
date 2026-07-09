import React from 'react'
import { useConectividade } from '../hooks/useConectividade'
import { useSyncStatus } from '../hooks/useSyncStatus'

function formatarData(iso) {
  if (!iso) return 'Nunca sincronizado'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Nunca sincronizado'
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  const horas = String(d.getHours()).padStart(2, '0')
  const minutos = String(d.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${ano} ${horas}:${minutos}`
}

export default function StatusBar() {
  const { online } = useConectividade()
  const { estado, ultimaSync } = useSyncStatus()

  const syncing = estado === 'syncing'
  const desabilitado = !online || syncing

  async function handleSync() {
    await window.electronAPI?.sync.forcarSync()
  }

  return (
    <div className="status-bar">
      <div className="status-bar-row">
        <span className={`status-dot ${online ? 'status-dot-online' : 'status-dot-offline'}`} />
        <span>{online ? 'Online' : 'Offline'}</span>
      </div>
      <div className="status-bar-sync">
        {ultimaSync ? `Última sync: ${formatarData(ultimaSync)}` : 'Nunca sincronizado'}
      </div>
      <button className="status-bar-btn" onClick={handleSync} disabled={desabilitado}>
        {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
      </button>
    </div>
  )
}
