import { useState, useEffect } from 'react'

export function useSyncStatus() {
  const [estado, setEstado] = useState('idle')
  const [ultimaSync, setUltimaSync] = useState(null)
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    window.electronAPI?.sync.getUltimaSync().then(setUltimaSync)
    const unsubscribe = window.electronAPI?.sync.onSyncStatus(status => {
      setEstado(status.estado)
      if (status.estado !== 'erro') setMensagem(null)
      if (status.mensagem) setMensagem(status.mensagem)
      if (status.timestamp) setUltimaSync(status.timestamp)
    })
    return () => unsubscribe?.()
  }, [])

  return { estado, ultimaSync, mensagem }
}