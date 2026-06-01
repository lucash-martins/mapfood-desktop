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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.4rem 1rem',
      background: 'var(--bg-secondary, #1a1a2e)',
      borderTop: '1px solid var(--border, #333)',
      fontSize: '0.75rem',
      color: 'var(--text-muted, #888)',
    }}>
      <span style={{
        width: '0.5rem',
        height: '0.5rem',
        borderRadius: '50%',
        background: online ? '#22c55e' : '#ef4444',
        flexShrink: 0,
      }} />
      <span>{online ? 'Online' : 'Offline'}</span>
      <span style={{ color: 'var(--border, #555)' }}>|</span>
      <span>
        {ultimaSync
          ? `Última sync: ${formatarData(ultimaSync)}`
          : 'Nunca sincronizado'}
      </span>
      <button
        onClick={handleSync}
        disabled={desabilitado}
        style={{
          marginLeft: 'auto',
          padding: '0.2rem 0.6rem',
          fontSize: '0.7rem',
          background: desabilitado ? 'transparent' : 'var(--primary, #6366f1)',
          color: desabilitado ? 'var(--text-muted, #888)' : '#fff',
          border: `1px solid ${desabilitado ? 'var(--border, #555)' : 'var(--primary, #6366f1)'}`,
          borderRadius: '0.25rem',
          cursor: desabilitado ? 'not-allowed' : 'pointer',
          opacity: desabilitado ? 0.6 : 1,
        }}
      >
        {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
      </button>
    </div>
  )
}