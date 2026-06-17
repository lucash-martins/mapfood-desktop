import React, { useState, useEffect } from 'react'
import { listarLojas, atualizarLoja } from '../services/api'

function badgeClass(status) {
  if (status === 'ATIVA') return 'badge badge-success'
  if (status === 'INATIVA') return 'badge badge-muted'
  return 'badge badge-muted'
}

const FILTROS_STATUS = ['Todas', 'ATIVA', 'INATIVA']

export default function Lojas() {
  const [lojas, setLojas] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todas')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [atualizando, setAtualizando] = useState(null)

  useEffect(() => {
    async function carregar() {
      try {
        const data = await listarLojas()
        setLojas(data || [])
      } catch (e) {
        setErro('Erro ao carregar lojas.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
    const cleanup = window.electronAPI?.sync.onSyncStatus((status) => {
      if (status.estado === 'idle') carregar()
    })
    return () => cleanup?.()
  }, [])

  async function handleMudarStatus(loja, novoStatus) {
    setAtualizando(loja.id)
    setErro(null)
    try {
      await atualizarLoja(loja.id, { statusLoja: novoStatus })
      setLojas(prev =>
        prev.map(l => l.id === loja.id ? { ...l, statusLoja: novoStatus } : l)
      )
    } catch (e) {
      setErro(e?.message || 'Erro ao atualizar status da loja.')
    } finally {
      setAtualizando(null)
    }
  }

  const lojasFiltradas = lojas
    .filter(l => filtroStatus === 'Todas' || l.statusLoja === filtroStatus)
    .filter(l => !busca.trim() || l.nome?.toLowerCase().includes(busca.trim().toLowerCase()))

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Lojas</h1>
      </div>

      {erro && <div className="error-msg" style={{ marginBottom: '1rem' }}>{erro}</div>}

      <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: 200 }}>
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {FILTROS_STATUS.map(f => (
              <button
                key={f}
                onClick={() => setFiltroStatus(f)}
                className={filtroStatus === f ? 'btn-primary' : 'btn-secondary'}
                style={{ width: 'auto' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 0 }}>
        {carregando ? (
          <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
        ) : lojasFiltradas.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Nenhuma loja encontrada.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Comerciante</th>
                  <th>Status</th>
                  <th>Data Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lojasFiltradas.map(loja => (
                  <tr key={loja.id}>
                    <td>#{loja.id}</td>
                    <td>{loja.nome || '—'}</td>
                    <td>{loja.comerciante?.nome || '—'}</td>
                    <td><span className={badgeClass(loja.statusLoja)}>{loja.statusLoja}</span></td>
                    <td>{loja.dataCadastro ? new Date(loja.dataCadastro).toLocaleDateString('pt-BR') : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {loja.statusLoja === 'ATIVA' && (
                          <button
                            className="btn-danger"
                            disabled={atualizando === loja.id}
                            onClick={() => handleMudarStatus(loja, 'INATIVA')}
                          >
                            {atualizando === loja.id ? '...' : 'Inativar'}
                          </button>
                        )}
                        {loja.statusLoja === 'INATIVA' && (
                          <button
                            className="btn-secondary"
                            disabled={atualizando === loja.id}
                            onClick={() => handleMudarStatus(loja, 'ATIVA')}
                          >
                            {atualizando === loja.id ? '...' : 'Ativar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
