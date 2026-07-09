import React, { useState, useEffect } from 'react'
import { listarAvaliacoes, atualizarAvaliacao, deletarAvaliacao } from '../services/api'
import EditModal from '../components/EditModal'
import Icon from '../components/Icon'

function renderEstrelas(nota) {
  const n = Number(nota) || 0
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

const FILTROS_NOTA = ['Todas', '1', '2', '3', '4', '5']

export default function Avaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState([])
  const [filtroNota, setFiltroNota] = useState('Todas')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [removendo, setRemovendo] = useState(null)
  const [editando, setEditando] = useState(null)

  useEffect(() => {
    async function carregar() {
      try {
        const data = await listarAvaliacoes()
        const ordenadas = (data || []).sort(
          (a, b) => new Date(b.dataAvaliacao) - new Date(a.dataAvaliacao)
        )
        setAvaliacoes(ordenadas)
      } catch (e) {
        setErro('Erro ao carregar avaliações.')
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

  async function handleRemover(id) {
    if (!window.confirm('Remover esta avaliação?')) return
    setRemovendo(id)
    try {
      await deletarAvaliacao(id)
      setAvaliacoes(prev => prev.filter(a => a.id !== id))
    } catch (e) {
      setErro('Erro ao remover avaliação.')
    } finally {
      setRemovendo(null)
    }
  }

  async function handleSalvarEdicao(avaliacao, valores) {
    const nota = Number(valores.nota)
    await atualizarAvaliacao(avaliacao.id, { nota, comentario: valores.comentario })
    setAvaliacoes(prev =>
      prev.map(a => a.id === avaliacao.id ? { ...a, nota, comentario: valores.comentario } : a)
    )
    setEditando(null)
  }

  const avaliacoesFiltradas = filtroNota === 'Todas'
    ? avaliacoes
    : avaliacoes.filter(a => String(a.nota) === filtroNota)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Avaliações</h1>
      </div>

      {erro && <div className="error-msg" style={{ marginBottom: '1rem' }}>{erro}</div>}

      <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '0.25rem' }}>Filtrar por nota:</span>
          {FILTROS_NOTA.map(f => (
            <button
              key={f}
              onClick={() => setFiltroNota(f)}
              className={filtroNota === f ? 'btn-primary' : 'btn-secondary'}
              style={{ width: 'auto' }}
            >
              {f === 'Todas' ? 'Todas' : `${f}★`}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 0 }}>
        {carregando ? (
          <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
        ) : avaliacoesFiltradas.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Nenhuma avaliação encontrada.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Loja</th>
                  <th>Consumidor</th>
                  <th>Nota</th>
                  <th>Comentário</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {avaliacoesFiltradas.map(a => {
                  const comentario = a.comentario?.length > 80
                    ? a.comentario.substring(0, 80) + '...'
                    : a.comentario
                  return (
                    <tr key={a.id}>
                      <td>#{a.id}</td>
                      <td>{a.loja?.nome || '—'}</td>
                      <td>{a.consumidor?.nome || '—'}</td>
                      <td style={{ color: 'var(--warning)', letterSpacing: '0.05em', fontSize: '1rem' }}>
                        {renderEstrelas(a.nota)}
                      </td>
                      <td style={{ maxWidth: 260 }}>{comentario || <span style={{ color: 'var(--text-muted)' }}>Sem comentário</span>}</td>
                      <td>{a.dataAvaliacao ? new Date(a.dataAvaliacao).toLocaleDateString('pt-BR') : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn-icon btn-secondary"
                            title="Editar"
                            onClick={() => setEditando(a)}
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            className="btn-icon btn-danger"
                            title="Remover"
                            disabled={removendo === a.id}
                            onClick={() => handleRemover(a.id)}
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editando && (
        <EditModal
          title={`Editar avaliação #${editando.id}`}
          fields={[
            { name: 'nota', label: 'Nota', type: 'select', options: [1, 2, 3, 4, 5] },
            { name: 'comentario', label: 'Comentário', type: 'textarea', rows: 5 },
          ]}
          initialValues={editando}
          onSave={(valores) => handleSalvarEdicao(editando, valores)}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  )
}
