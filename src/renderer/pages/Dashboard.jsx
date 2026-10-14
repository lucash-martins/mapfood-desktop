import React, { useState, useEffect } from 'react'
import { atualizarLoja, recusarSolicitacaoDestaque } from '../services/api'

const ABA_DENUNCIAS = 'denuncias'
const ABA_DESTAQUE = 'destaque'

function formatarDataHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [aba, setAba] = useState(ABA_DENUNCIAS)
  const [processando, setProcessando] = useState(null)
  const [erroPedido, setErroPedido] = useState(null)

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

  // Aprovar = promover a loja a Destaque (vai pela fila de sync, como na página Lojas);
  // recusar = apagar o pedido na API (precisa de rede).
  async function handlePedido(loja, aprovar) {
    setProcessando(loja.id)
    setErroPedido(null)
    try {
      if (aprovar) {
        await atualizarLoja(loja.id, { tipoLoja: 'DESTAQUE' })
      } else {
        await recusarSolicitacaoDestaque(loja.id)
      }
      setStats(prev => prev && {
        ...prev,
        pedidosDestaque: Math.max(0, (prev.pedidosDestaque ?? 1) - 1),
        lojasDestaque: aprovar ? (prev.lojasDestaque ?? 0) + 1 : prev.lojasDestaque,
        listaPedidosDestaque: (prev.listaPedidosDestaque ?? []).filter(l => l.id !== loja.id),
      })
    } catch (e) {
      setErroPedido(e?.status === 401
        ? 'Sessão expirada. Saia e entre novamente para concluir esta ação.'
        : e?.message || 'Erro ao processar o pedido de destaque.')
    } finally {
      setProcessando(null)
    }
  }

  const cards = stats
    ? [
        { titulo: 'Total de Lojas', valor: stats.totalLojas ?? 0 },
        { titulo: 'Lojas Ativas', valor: stats.lojasAtivas ?? 0 },
        { titulo: 'Lojas em Destaque', valor: stats.lojasDestaque ?? 0 },
        { titulo: 'Pedidos de Destaque', valor: stats.pedidosDestaque ?? 0, aba: ABA_DESTAQUE },
        { titulo: 'Consumidores', valor: stats.totalConsumidores ?? 0 },
        { titulo: 'Comerciantes', valor: stats.totalComerciantes ?? 0 },
        { titulo: 'Denúncias Pendentes', valor: stats.denunciasPendentes ?? 0 },
        { titulo: 'Total Avaliações', valor: stats.totalAvaliacoes ?? 0 },
      ]
    : []

  const denunciasRecentes = stats?.denunciasRecentes ?? []
  const pedidosDestaque = stats?.listaPedidosDestaque ?? []

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
              <div
                className="card"
                key={card.titulo}
                style={{ marginBottom: 0, cursor: card.aba ? 'pointer' : undefined }}
                onClick={card.aba ? () => setAba(card.aba) : undefined}
                title={card.aba ? 'Ver pedidos de destaque' : undefined}
              >
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
            <div role="tablist" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button
                role="tab"
                aria-selected={aba === ABA_DENUNCIAS}
                className={aba === ABA_DENUNCIAS ? 'btn-primary' : 'btn-secondary'}
                style={{ width: 'auto' }}
                onClick={() => setAba(ABA_DENUNCIAS)}
              >
                Denúncias Recentes
              </button>
              <button
                role="tab"
                aria-selected={aba === ABA_DESTAQUE}
                className={aba === ABA_DESTAQUE ? 'btn-destaque' : 'btn-secondary'}
                style={{ width: 'auto' }}
                onClick={() => setAba(ABA_DESTAQUE)}
              >
                ⭐ Pedidos de Destaque ({pedidosDestaque.length})
              </button>
            </div>

            {aba === ABA_DESTAQUE ? (
              <>
                {erroPedido && <div className="error-msg" style={{ marginBottom: '1rem' }}>{erroPedido}</div>}
                {pedidosDestaque.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>Nenhum pedido de destaque pendente.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Loja</th>
                          <th>Comerciante</th>
                          <th>Status</th>
                          <th>Solicitado em</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pedidosDestaque.map(loja => (
                          <tr key={loja.id}>
                            <td>#{loja.id}</td>
                            <td>{loja.nome || '—'}</td>
                            <td>{loja.comerciante?.nome || '—'}</td>
                            <td><span className="badge badge-muted">{loja.statusLoja || '—'}</span></td>
                            <td>{formatarDataHora(loja.destaqueSolicitadoEm)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <button
                                  className="btn-destaque"
                                  style={{ width: 'auto' }}
                                  disabled={processando === loja.id}
                                  onClick={() => handlePedido(loja, true)}
                                >
                                  ⭐ Tornar Destaque
                                </button>
                                <button
                                  className="btn-secondary"
                                  style={{ width: 'auto' }}
                                  disabled={processando === loja.id}
                                  onClick={() => handlePedido(loja, false)}
                                >
                                  Recusar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : denunciasRecentes.length === 0 ? (
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