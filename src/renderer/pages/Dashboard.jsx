import React, { useState, useEffect } from 'react'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  async function carregar() {
    try {
      const s = await window.electronAPI?.db.getDashboardStats()
      setStats(s || {})
    } catch (e) {
      setErro('Erro ao carregar dados do dashboard.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()

    // Recarrega os cards sempre que um sync terminar com sucesso
    const unsubscribe = window.electronAPI?.sync.onSyncStatus((status) => {
      if (status.estado === 'idle') carregar()
    })

    return () => unsubscribe?.()
  }, [])

  const badgeClass = (status) => {
    if (status === 'PENDENTE') return 'badge badge-warning'
    if (status === 'EM_ANALISE') return 'badge badge-warning'
    if (status === 'RESOLVIDA') return 'badge badge-success'
    return 'badge badge-muted'
  }

  const cards = stats
    ? [
        { titulo: 'Total de Lojas', valor: stats.totalLojas ?? 0 },
        { titulo: 'Lojas Ativas', valor: stats.lojasAtivas ?? 0 },
        { titulo: 'Consumidores', valor: stats.totalConsumidores ?? 0 },
        { titulo: 'Comerciantes', valor: stats.totalComerciantes ?? 0 },
        { titulo: 'Denúncias Pendentes', valor: stats.denunciasPendentes ?? 0 },
        { titulo: 'Total Avaliações', valor: stats.totalAvaliacoes ?? 0 },
      ]
    : []

  const denunciasRecentes = stats?.denunciasRecentes ?? []

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {carregando && <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>}
      {erro && <div className="error-msg">{erro}</div>}

      {!carregando && !erro && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {cards.map(card => (
              <div className="card" key={card.titulo} style={{ marginBottom: 0 }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  {card.titulo}
                </p>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>
                  {card.valor}
                </p>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <h2 style={{ marginBottom: '1rem' }}>Denúncias Recentes</h2>
            {denunciasRecentes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhuma denúncia encontrada.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Loja</th>
                      <th>Consumidor</th>
                      <th>Status</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {denunciasRecentes.map(d => (
                      <tr key={d.id}>
                        <td>#{d.id}</td>
                        <td>{d.loja?.nome || '—'}</td>
                        <td>{d.consumidor?.nome || '—'}</td>
                        <td><span className={badgeClass(d.statusDenuncia)}>{d.statusDenuncia}</span></td>
                        <td>{d.dataDenuncia ? new Date(d.dataDenuncia).toLocaleDateString('pt-BR') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}