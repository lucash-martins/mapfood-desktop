import React, { useState, useEffect } from 'react'
import { listarConsumidores, listarComerciantes, listarLojas, deletarConsumidor, deletarComerciante, deletarComercianteCascade } from '../services/api'

const tabStyle = (ativo) => ({
  padding: '0.5rem 1.25rem',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
  background: ativo ? 'var(--primary)' : 'var(--bg)',
  color: ativo ? 'var(--white)' : 'var(--text)',
  borderBottom: ativo ? 'none' : '1px solid var(--border)',
  transition: 'background 0.15s, color 0.15s',
})

export default function Usuarios() {
  const [abaAtiva, setAbaAtiva] = useState('consumidores')
  const [consumidores, setConsumidores] = useState([])
  const [comerciantes, setComerciantes] = useState([])
  const [buscaConsumidor, setBuscaConsumidor] = useState('')
  const [buscaComerciante, setBuscaComerciante] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [removendo, setRemovendo] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    async function carregar() {
      try {
        const [c, co] = await Promise.all([
          listarConsumidores(),
          listarComerciantes(),
        ])
        // Deduplica por id — garante um registro por usuário mesmo que o banco tenha entradas antigas
        const consumidoresUnicos = Array.from(
          new Map((c || []).filter(u => u.id != null).map(u => [u.id, u])).values()
        )
        const comerciantesUnicos = Array.from(
          new Map((co || []).filter(u => u.id != null).map(u => [u.id, u])).values()
        )
        setConsumidores(consumidoresUnicos)
        setComerciantes(comerciantesUnicos)
      } catch (e) {
        setErro('Erro ao carregar usuários.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [tick])

  useEffect(() => {
    const cleanup = window.electronAPI?.sync.onSyncStatus((status) => {
      if (status.estado === 'idle') setTick(t => t + 1)
    })
    return () => cleanup?.()
  }, [])

  async function handleRemoverConsumidor(id) {
    if (!window.confirm('Remover este consumidor?')) return
    setRemovendo(id)
    setErro(null)
    try {
      await deletarConsumidor(id)
      setConsumidores(prev => prev.filter(c => c.id !== id))
    } catch (e) {
      setErro('Erro ao remover consumidor.')
    } finally {
      setRemovendo(null)
    }
  }

  async function handleRemoverComerciante(id) {
    const todasLojas = await listarLojas()
    const lojasDoComerciante = (todasLojas || []).filter(l => l.comercianteId === id)

    if (lojasDoComerciante.length > 0) {
      const qtd = lojasDoComerciante.length
      const msg = `Este comerciante possui ${qtd} loja${qtd > 1 ? 's' : ''} associada${qtd > 1 ? 's' : ''}.\nAo excluí-lo, as lojas também serão excluídas.\n\nDeseja continuar?`
      if (!window.confirm(msg)) return
      setRemovendo(id)
      setErro(null)
      try {
        await deletarComercianteCascade(id)
        setComerciantes(prev => prev.filter(c => c.id_comerciante !== id))
      } catch (e) {
        setErro(
          e?.status === 409 || e?.message?.includes('409')
            ? 'Não foi possível excluir: as lojas possuem dados vinculados (pedidos, denúncias ou outros registros) que impedem a exclusão. Remova esses dados pelo sistema antes de excluir o comerciante.'
            : 'Erro ao remover comerciante.'
        )
      } finally {
        setRemovendo(null)
      }
    } else {
      if (!window.confirm('Remover este comerciante?')) return
      setRemovendo(id)
      setErro(null)
      try {
        await deletarComerciante(id)
        setComerciantes(prev => prev.filter(c => c.id_comerciante !== id))
      } catch (e) {
        setErro(e.message && !e.message.startsWith('HTTP') ? e.message : 'Erro ao remover comerciante.')
      } finally {
        setRemovendo(null)
      }
    }
  }

  const consumidoresFiltrados = consumidores.filter(c =>
    !buscaConsumidor.trim() || c.nome?.toLowerCase().includes(buscaConsumidor.trim().toLowerCase())
  )

  const comerciantesFiltrados = comerciantes.filter(c =>
    !buscaComerciante.trim() || c.nome?.toLowerCase().includes(buscaComerciante.trim().toLowerCase())
  )

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Usuários</h1>
      </div>

      {erro && <div className="error-msg" style={{ marginBottom: '1rem' }}>{erro}</div>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button style={tabStyle(abaAtiva === 'consumidores')} onClick={() => setAbaAtiva('consumidores')}>
          Consumidores
        </button>
        <button style={tabStyle(abaAtiva === 'comerciantes')} onClick={() => setAbaAtiva('comerciantes')}>
          Comerciantes
        </button>
      </div>

      {carregando ? (
        <div className="card">
          <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
        </div>
      ) : abaAtiva === 'consumidores' ? (
        <>
          <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1.5rem' }}>
            <input
              type="text"
              placeholder="Buscar consumidor por nome..."
              value={buscaConsumidor}
              onChange={e => setBuscaConsumidor(e.target.value)}
            />
          </div>
          <div className="card" style={{ marginBottom: 0 }}>
            {consumidoresFiltrados.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhum consumidor encontrado.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>CPF</th>
                      <th>Celular</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumidoresFiltrados.map(c => (
                      <tr key={c.id}>
                        <td>#{c.id}</td>
                        <td>{c.nome || '—'}</td>
                        <td>{c.email || '—'}</td>
                        <td>{c.cpf || '—'}</td>
                        <td>{c.celular || '—'}</td>
                        <td>
                          <button
                            className="btn-danger"
                            disabled={removendo === c.id}
                            onClick={() => handleRemoverConsumidor(c.id)}
                          >
                            {removendo === c.id ? 'Removendo...' : 'Remover'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1.5rem' }}>
            <input
              type="text"
              placeholder="Buscar comerciante por nome..."
              value={buscaComerciante}
              onChange={e => setBuscaComerciante(e.target.value)}
            />
          </div>
          <div className="card" style={{ marginBottom: 0 }}>
            {comerciantesFiltrados.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhum comerciante encontrado.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comerciantesFiltrados.map(c => (
                      <tr key={c.id_comerciante}>
                        <td>#{c.id_comerciante}</td>
                        <td>{c.nome || '—'}</td>
                        <td>{c.email || '—'}</td>
                        <td>
                          <button
                            className="btn-danger"
                            disabled={removendo === c.id_comerciante}
                            onClick={() => handleRemoverComerciante(c.id_comerciante)}
                          >
                            {removendo === c.id_comerciante ? 'Removendo...' : 'Remover'}
                          </button>
                        </td>
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
