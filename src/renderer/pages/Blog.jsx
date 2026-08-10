import React, { useState, useEffect, useMemo } from 'react'
import { getBlogStats, resolveImagemUrl } from '../services/api'

const COLUNAS_POST = [
  { key: 'titulo', label: 'Título' },
  { key: 'comerciante_nome', label: 'Comerciante' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'data_publicacao', label: 'Data' },
  { key: 'total_curtidas', label: 'Curtidas' },
  { key: 'total_comentarios', label: 'Comentários' },
]

function normalizarBusca(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

function formatData(data) {
  if (!data) return '—'
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

function exportCSV(rows, headers, filename) {
  const escape = (val) => {
    const s = String(val ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const linhas = [
    headers.map(h => escape(h.label)).join(';'),
    ...rows.map(row => headers.map(h => escape(row[h.key])).join(';')),
  ]
  const blob = new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Uma foto cuja URL não carrega mais some da grade em vez de ficar como "imagem indisponível"
function ThumbImg({ src, alt, onClick, onIndisponivel }) {
  const [oculto, setOculto] = useState(false)
  if (oculto) return null
  return (
    <img
      src={resolveImagemUrl(src)}
      alt={alt}
      className="galeria-thumb"
      loading="lazy"
      onClick={onClick}
      onError={() => { setOculto(true); onIndisponivel() }}
    />
  )
}

function LightboxImg({ src, alt, onIndisponivel }) {
  const [oculto, setOculto] = useState(false)
  if (oculto) return null
  return (
    <img
      src={resolveImagemUrl(src)}
      alt={alt}
      className="lightbox-img"
      onError={() => { setOculto(true); onIndisponivel() }}
    />
  )
}

// Modal somente-leitura — o Desktop não edita posts, só precisa exibir o conteúdo
// e a galeria pra dar suporte à análise de denúncias sobre o blog.
function PostModal({ post, onClose }) {
  const [indice, setIndice] = useState(null) // null = grade, número = lightbox
  const [indisponiveis, setIndisponiveis] = useState([])
  const imagens = (post.galeria || []).filter(url => url && !indisponiveis.includes(url))

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        if (indice !== null) setIndice(null)
        else onClose()
      } else if (indice !== null && e.key === 'ArrowRight') {
        setIndice(i => (i + 1) % imagens.length)
      } else if (indice !== null && e.key === 'ArrowLeft') {
        setIndice(i => (i - 1 + imagens.length) % imagens.length)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [indice, imagens.length, onClose])

  useEffect(() => {
    if (indice !== null && indice >= imagens.length) setIndice(null)
  }, [imagens.length, indice])

  function handleImagemIndisponivel(url) {
    setIndisponiveis(prev => [...prev, url])
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{post.titulo || 'Post'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        {indice === null ? (
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              {post.comerciante_nome || '—'} · {post.tipo || '—'} · {formatData(post.data_publicacao)}
            </p>
            <p style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{post.conteudo || <em>Sem conteúdo.</em>}</p>

            {imagens.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Sem imagens na galeria.</p>
            ) : (
              <div className="galeria-grid">
                {imagens.map((url, i) => (
                  <div className="galeria-thumb-wrapper" key={url}>
                    <ThumbImg
                      src={url}
                      alt={`${post.titulo} — foto ${i + 1}`}
                      onClick={() => setIndice(i)}
                      onIndisponivel={() => handleImagemIndisponivel(url)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="lightbox-toolbar">
              <button className="lightbox-back" onClick={() => setIndice(null)}>← Voltar</button>
            </div>
            <div className="lightbox">
              <button
                className="lightbox-nav"
                disabled={imagens.length < 2}
                onClick={() => setIndice(i => (i - 1 + imagens.length) % imagens.length)}
              >‹</button>
              <LightboxImg
                key={imagens[indice]}
                src={imagens[indice]}
                alt={`${post.titulo} — foto ${indice + 1}`}
                onIndisponivel={() => handleImagemIndisponivel(imagens[indice])}
              />
              <button
                className="lightbox-nav"
                disabled={imagens.length < 2}
                onClick={() => setIndice(i => (i + 1) % imagens.length)}
              >›</button>
              <div className="lightbox-counter">{indice + 1} / {imagens.length}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Blog() {
  const [stats, setStats] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [busca, setBusca] = useState('')
  const [sortBy, setSortBy] = useState('data_publicacao')
  const [sortDir, setSortDir] = useState('desc')
  const [postSelecionado, setPostSelecionado] = useState(null)

  async function carregar() {
    try {
      const s = await getBlogStats()
      setStats(s || {})
      setErro(null)
    } catch (e) {
      setErro('Erro ao carregar dados do blog.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()

    const unsubscribe = window.electronAPI?.sync.onSyncStatus((status) => {
      if (status.estado === 'idle') carregar()
    })

    return () => unsubscribe?.()
  }, [])

  function handleOrdenar(coluna) {
    if (sortBy === coluna) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(coluna)
      setSortDir('desc')
    }
  }

  const postsDetalhe = useMemo(() => {
    const termo = normalizarBusca(busca)
    const lista = (stats?.postsDetalhe ?? []).filter(p =>
      !termo || normalizarBusca(p.titulo).includes(termo) || normalizarBusca(p.comerciante_nome).includes(termo)
    )
    const dir = sortDir === 'asc' ? 1 : -1
    return [...lista].sort((a, b) => {
      const va = a[sortBy] ?? 0
      const vb = b[sortBy] ?? 0
      if (typeof va === 'string') return va.localeCompare(vb) * dir
      return (va - vb) * dir
    })
  }, [stats, busca, sortBy, sortDir])

  if (carregando) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Blog</h1></div>
        <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Blog</h1></div>
        <div className="error-msg">{erro}</div>
      </div>
    )
  }

  const kpis = [
    { key: 'totalPosts', label: 'Total de Posts', valor: stats.totalPosts ?? 0 },
    { key: 'totalCurtidas', label: 'Curtidas', valor: stats.totalCurtidas ?? 0 },
    { key: 'totalComentarios', label: 'Comentários', valor: stats.totalComentarios ?? 0 },
  ]

  const postsPorComerciante = stats.postsPorComerciante ?? []
  const rankingPosts = stats.rankingPosts ?? []

  function handleExportarPosts() {
    exportCSV(
      postsDetalhe.map(p => ({ ...p, data_publicacao: formatData(p.data_publicacao) })),
      COLUNAS_POST,
      `mapfood-blog-${new Date().toISOString().slice(0, 10)}.csv`
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Blog</h1>
      </div>

      <div className="kpi-grid">
        {kpis.map(kpi => (
          <div className="kpi-card" key={kpi.key}>
            <p className="kpi-label">{kpi.label}</p>
            <p className="kpi-value">{kpi.valor}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Posts por Comerciante</h2>
        {postsPorComerciante.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Nenhum post publicado no blog.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Comerciante</th>
                  <th>Posts</th>
                  <th>Curtidas</th>
                  <th>Comentários</th>
                </tr>
              </thead>
              <tbody>
                {postsPorComerciante.map(p => (
                  <tr key={p.comerciante_id ?? p.comerciante_nome}>
                    <td>{p.comerciante_nome || '—'}</td>
                    <td>{p.total_posts}</td>
                    <td>{p.total_curtidas}</td>
                    <td>{p.total_comentarios}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Ranking de Posts (Top 10 por Engajamento)</h2>
        {rankingPosts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Nenhum post publicado no blog.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Comerciante</th>
                  <th>Data</th>
                  <th>Curtidas</th>
                  <th>Comentários</th>
                </tr>
              </thead>
              <tbody>
                {rankingPosts.map(p => (
                  <tr key={p.id}>
                    <td>{p.titulo || '—'}</td>
                    <td>{p.comerciante_nome || '—'}</td>
                    <td>{formatData(p.data_publicacao)}</td>
                    <td>{p.total_curtidas}</td>
                    <td>{p.total_comentarios}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <h2>Todos os Posts</h2>
          <button className="btn-secondary" style={{ width: 'auto' }} onClick={handleExportarPosts}>
            ⬇ Baixar CSV
          </button>
        </div>

        <div style={{ marginBottom: '1rem', maxWidth: 320 }}>
          <input
            type="text"
            placeholder="Buscar por título ou comerciante..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        {postsDetalhe.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Nenhum post encontrado.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {COLUNAS_POST.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleOrdenar(col.key)}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      {col.label}{sortBy === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                  <th>Imagens</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {postsDetalhe.map(p => (
                  <tr key={p.id}>
                    <td>{p.titulo || '—'}</td>
                    <td>{p.comerciante_nome || '—'}</td>
                    <td>{p.tipo || '—'}</td>
                    <td>{formatData(p.data_publicacao)}</td>
                    <td>{p.total_curtidas}</td>
                    <td>{p.total_comentarios}</td>
                    <td>{(p.galeria || []).length}</td>
                    <td>
                      <button className="btn-secondary" style={{ width: 'auto' }} onClick={() => setPostSelecionado(p)}>
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {postSelecionado && (
        <PostModal post={postSelecionado} onClose={() => setPostSelecionado(null)} />
      )}
    </div>
  )
}
