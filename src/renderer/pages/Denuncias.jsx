import React, { useState, useEffect } from 'react'
import { listarDenuncias, atualizarDenuncia } from '../services/api'

const STATUS_ORDEM = ['PENDENTE', 'EM_ANALISE', 'RESOLVIDA']

const STATUS_LABEL = {
  PENDENTE: 'PENDENTE',
  EM_ANALISE: 'EM ANÁLISE',
  RESOLVIDA: 'RESOLVIDA',
}

function statusLabel(status) {
  return STATUS_LABEL[status] ?? (status?.replace('_', ' ') ?? status)
}

function proximoStatus(atual) {
  const idx = STATUS_ORDEM.indexOf(atual)
  if (idx === -1 || idx === STATUS_ORDEM.length - 1) return null
  return STATUS_ORDEM[idx + 1]
}

function badgeClass(status) {
  if (status === 'PENDENTE') return 'badge badge-warning'
  if (status === 'EM_ANALISE') return 'badge badge-danger'
  if (status === 'RESOLVIDA') return 'badge badge-success'
  return 'badge badge-muted'
}

const FILTROS = ['Todas', 'PENDENTE', 'EM_ANALISE', 'RESOLVIDA']

export default function Denuncias() {
  const [denuncias, setDenuncias] = useState([])
  const [filtro, setFiltro] = useState('Todas')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [atualizando, setAtualizando] = useState(null)

  useEffect(() => {
    async function carregar() {
      try {
        const data = await listarDenuncias()
        setDenuncias(data || [])
      } catch (e) {
        setErro('Erro ao carregar denúncias.')
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

  async function handleAvancar(denuncia) {
    const novo = proximoStatus(denuncia.statusDenuncia)
    if (!novo) return
    setErro(null)
    setAtualizando(denuncia.id)
    try {
      await atualizarDenuncia(denuncia.id, { statusDenuncia: novo })
      setDenuncias(prev =>
        prev.map(d => d.id === denuncia.id ? { ...d, statusDenuncia: novo } : d)
      )
    } catch (e) {
      setErro('Erro ao atualizar denúncia.')
    } finally {
      setAtualizando(null)
    }
  }

  const denunciasFiltradas = filtro === 'Todas'
    ? denuncias
    : denuncias.filter(d => d.statusDenuncia === filtro)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Denúncias</h1>
      </div>

      {erro && <div className="error-msg" style={{ marginBottom: '1rem' }}>{erro}</div>}

      <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {FILTROS.map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={filtro === f ? 'btn-primary' : 'btn-secondary'}
              style={{ width: 'auto' }}
            >
              {f === 'Todas' ? 'Todas' : statusLabel(f)}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 0 }}>
        {carregando ? (
          <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
        ) : denunciasFiltradas.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Nenhuma denúncia encontrada.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Loja</th>
                  <th>Consumidor</th>
                  <th>Descrição</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {denunciasFiltradas.map(d => {
                  const proximo = proximoStatus(d.statusDenuncia)
                  const descricao = d.descricao?.length > 60
                    ? d.descricao.substring(0, 60) + '...'
                    : d.descricao
                  return (
                    <tr key={d.id}>
                      <td>#{d.id}</td>
                      <td>{d.loja?.nome || '—'}</td>
                      <td>{d.consumidor?.nome || '—'}</td>
                      <td style={{ maxWidth: 220 }}>{descricao || '—'}</td>
                      <td><span className={badgeClass(d.statusDenuncia)}>{statusLabel(d.statusDenuncia)}</span></td>
                      <td>{d.dataDenuncia ? new Date(d.dataDenuncia).toLocaleDateString('pt-BR') : '—'}</td>
                      <td>
                        <button
                          className="btn-secondary"
                          disabled={!proximo || atualizando === d.id}
                          onClick={() => handleAvancar(d)}
                          title={proximo ? `Avançar para ${statusLabel(proximo)}` : 'Status final'}
                        >
                          {atualizando === d.id ? 'Salvando...' : proximo ? `→ ${statusLabel(proximo)}` : 'Resolvida'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
