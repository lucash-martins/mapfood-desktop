import { useState, useEffect } from 'react'

export function useConectividade() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    window.electronAPI?.app.getStatusConexao().then(setOnline)
    const unsubscribe = window.electronAPI?.app.onStatusConexao(setOnline)
    return () => unsubscribe?.()
  }, [])

  return { online }
}