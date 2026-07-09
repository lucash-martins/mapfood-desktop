import React, { useState, useEffect } from 'react'
import { listarConsumidores, listarComerciantes, atualizarConsumidor, deletarConsumidor, deletarConsumidorCascade, verificarDadosConsumidor, atualizarComerciante, deletarComerciante, deletarComercianteCascade, verificarDadosComerciante, atualizarComercianteDashboard, resolveImagemUrl } from '../services/api'
import EditModal from '../components/EditModal'
import Icon from '../components/Icon'

function Avatar({ src, nome }) {
  const [erro, setErro] = useState(false)
  const url = resolveImagemUrl(src)
  if (!url || erro) {
    return <div className="avatar-placeholder">{(nome || '?').trim().charAt(0).toUpperCase()}</div>
  }
  return <img className="avatar" src={url} alt={nome || ''} onError={() => setErro(true)} />
}

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
  const [alterandoDashboard, setAlterandoDashboard] = useState(null)
  const [editandoConsumidor, setEditandoConsumidor] = useState(null)
  const [editandoComerciante, setEditandoComerciante] = useState(null)
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
    setErro(null)
    let dados = null
    try { dados = await verificarDadosConsumidor(id) } catch {}
    const temDados = dados && (dados.avaliacoes > 0 || dados.denuncias > 0)

    let confirmado
    if (temDados) {
      const linhas = ['Este consumidor possui dados vinculados que também serão excluídos:']
      if (dados.avaliacoes > 0) linhas.push(`• ${dados.avaliacoes} avaliação(ões)`)
      if (dados.denuncias > 0) linhas.push(`• ${dados.denuncias} denúncia(s)`)
      linhas.push('\nDeseja excluir o consumidor e todos os dados vinculados?')
      confirmado = window.confirm(linhas.join('\n'))
    } else {
      confirmado = window.confirm('Remover este consumidor?')
    }

    if (!confirmado) return
    setRemovendo(id)
    try {
      if (temDados) {
        await deletarConsumidorCascade(id)
      } else {
        await deletarConsumidor(id)
      }
      setConsumidores(prev => prev.filter(c => c.id !== id))
    } catch (e) {
      setErro('Erro ao remover consumidor.')
    } finally {
      setRemovendo(null)
    }
  }

  async function handleRemoverComerciante(id) {
    setErro(null)
    let dados = null
    try { dados = await verificarDadosComerciante(id) } catch {}
    const temDados = dados && (dados.lojas > 0 || dados.avaliacoes > 0 || dados.denuncias > 0)

    let confirmado
    if (temDados) {
      const linhas = ['Este comerciante possui dados vinculados que também serão excluídos:']
      if (dados.lojas > 0) linhas.push(`• ${dados.lojas} loja(s)`)
      if (dados.avaliacoes > 0) linhas.push(`• ${dados.avaliacoes} avaliação(ões)`)
      if (dados.denuncias > 0) linhas.push(`• ${dados.denuncias} denúncia(s)`)
      linhas.push('\nDeseja excluir o comerciante e todos os dados vinculados?')
      confirmado = window.confirm(linhas.join('\n'))
    } else {
      confirmado = window.confirm('Remover este comerciante?')
    }

    if (!confirmado) return
    setRemovendo(id)
    try {
      if (temDados) {
        await deletarComercianteCascade(id)
      } else {
        await deletarComerciante(id)
      }
      setComerciantes(prev => prev.filter(c => c.id_comerciante !== id))
    } catch (e) {
      setErro('Erro ao remover comerciante.')
    } finally {
      setRemovendo(null)
    }
  }

  async function handleToggleDashboard(id, novoEstado) {
    setErro(null)
    setAlterandoDashboard(id)
    try {
      await atualizarComercianteDashboard(id, novoEstado)
      setComerciantes(prev =>
        prev.map(c => c.id_comerciante === id ? { ...c, dashboardEnabled: novoEstado } : c)
      )
    } catch (e) {
      setErro('Erro ao alterar permissão de dashboard.')
    } finally {
      setAlterandoDashboard(null)
    }
  }

  async function handleSalvarConsumidor(consumidor, valores) {
    await atualizarConsumidor(consumidor.id, valores)
    setConsumidores(prev =>
      prev.map(c => c.id === consumidor.id ? { ...c, ...valores } : c)
    )
    setEditandoConsumidor(null)
  }

  async function handleSalvarComerciante(comerciante, valores) {
    await atualizarComerciante(comerciante.id_comerciante, valores)
    setComerciantes(prev =>
      prev.map(c => c.id_comerciante === comerciante.id_comerciante ? { ...c, ...valores } : c)
    )
    setEditandoComerciante(null)
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
                      <th>Foto</th>
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
                        <td><Avatar src={c.imagemUrl} nome={c.nome} /></td>
                        <td>#{c.id}</td>
                        <td>{c.nome || '—'}</td>
                        <td>{c.email || '—'}</td>
                        <td>{c.cpf || '—'}</td>
                        <td>{c.celular || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="btn-icon btn-secondary"
                              title="Editar"
                              onClick={() => setEditandoConsumidor(c)}
                            >
                              <Icon name="edit" />
                            </button>
                            <button
                              className="btn-icon btn-danger"
                              title="Remover"
                              disabled={removendo === c.id}
                              onClick={() => handleRemoverConsumidor(c.id)}
                            >
                              <Icon name="trash" />
                            </button>
                          </div>
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
                      <th>Foto</th>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Dashboard</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comerciantesFiltrados.map(c => (
                      <tr key={c.id_comerciante}>
                        <td><Avatar src={c.imagemUrl} nome={c.nome} /></td>
                        <td>#{c.id_comerciante}</td>
                        <td>{c.nome || '—'}</td>
                        <td>{c.email || '—'}</td>
                        <td>
                          <span className={c.dashboardEnabled ? 'badge badge-success' : 'badge badge-muted'}>
                            {c.dashboardEnabled ? 'Liberado' : 'Bloqueado'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="btn-icon btn-secondary"
                              title="Editar"
                              onClick={() => setEditandoComerciante(c)}
                            >
                              <Icon name="edit" />
                            </button>
                            {c.dashboardEnabled ? (
                              <button
                                className="btn-icon btn-danger"
                                title="Retirar acesso ao dashboard"
                                disabled={alterandoDashboard === c.id_comerciante}
                                onClick={() => handleToggleDashboard(c.id_comerciante, false)}
                              >
                                <Icon name="lock" />
                              </button>
                            ) : (
                              <button
                                className="btn-icon btn-secondary"
                                title="Liberar acesso ao dashboard"
                                disabled={alterandoDashboard === c.id_comerciante}
                                onClick={() => handleToggleDashboard(c.id_comerciante, true)}
                              >
                                <Icon name="unlock" />
                              </button>
                            )}
                            <button
                              className="btn-icon btn-danger"
                              title="Remover"
                              disabled={removendo === c.id_comerciante}
                              onClick={() => handleRemoverComerciante(c.id_comerciante)}
                            >
                              <Icon name="trash" />
                            </button>
                          </div>
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

      {editandoConsumidor && (
        <EditModal
          title={`Editar consumidor — ${editandoConsumidor.nome || '#' + editandoConsumidor.id}`}
          fields={[
            { name: 'nome', label: 'Nome' },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'cpf', label: 'CPF' },
            { name: 'celular', label: 'Celular' },
          ]}
          initialValues={editandoConsumidor}
          onSave={(valores) => handleSalvarConsumidor(editandoConsumidor, valores)}
          onClose={() => setEditandoConsumidor(null)}
        />
      )}

      {editandoComerciante && (
        <EditModal
          title={`Editar comerciante — ${editandoComerciante.nome || '#' + editandoComerciante.id_comerciante}`}
          fields={[
            { name: 'nome', label: 'Nome' },
            { name: 'email', label: 'Email', type: 'email' },
          ]}
          initialValues={editandoComerciante}
          onSave={(valores) => handleSalvarComerciante(editandoComerciante, valores)}
          onClose={() => setEditandoComerciante(null)}
        />
      )}
    </div>
  )
}
