import React, { useState, useEffect } from 'react'
import { listarLojas, atualizarLoja, resolveImagemUrl, enviarImagemLoja, removerImagemLoja, enviarGaleriaLoja, removerImagemGaleriaLoja } from '../services/api'
import EditModal from '../components/EditModal'
import EditarImagemModal from '../components/EditarImagemModal'
import Icon from '../components/Icon'

function Avatar({ src, nome }) {
  const [erro, setErro] = useState(false)
  const url = resolveImagemUrl(src)
  if (!url || erro) {
    return <div className="avatar-placeholder avatar-loja">{(nome || '?').trim().charAt(0).toUpperCase()}</div>
  }
  return <img className="avatar avatar-loja" src={url} alt={nome || ''} onError={() => setErro(true)} />
}

// Uma foto cuja URL não carrega mais está, na prática, excluída — some da grade
// e do contador em vez de ficar ocupando espaço como "imagem indisponível".
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

// Precisa ser remontado (key={src} no local de uso) ao navegar entre fotos,
// senão o estado de "oculto" de uma foto quebrada vazaria para a próxima.
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

function GaleriaModal({ loja, onGaleriaChange, onClose }) {
  const [indice, setIndice] = useState(null) // null = grade, número = lightbox
  const [enviando, setEnviando] = useState(false)
  const [removendo, setRemovendo] = useState(null)
  const [erro, setErro] = useState(null)

  const nome = loja.nome
  const galeria = loja.galeria || []
  const imagens = galeria.filter(Boolean)

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

  // O índice pode ficar fora dos limites depois de uma remoção — volta pra grade nesse caso
  useEffect(() => {
    if (indice !== null && indice >= imagens.length) setIndice(null)
  }, [imagens.length, indice])

  async function handleAdicionarFotos(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setErro(null)
    setEnviando(true)
    try {
      const atualizado = await enviarGaleriaLoja(loja.id, files)
      onGaleriaChange(atualizado.galeria || [])
    } catch (err) {
      setErro(err?.message || 'Erro ao enviar imagens.')
    } finally {
      setEnviando(false)
    }
  }

  // Uma foto que não carrega mais não existe de fato — tira da galeria local
  // (sem chamada à API: se ela ainda existisse no servidor, o próximo sync a devolve)
  function handleImagemIndisponivel(url) {
    onGaleriaChange(galeria.filter(g => g !== url))
    if (indice !== null && imagens[indice] === url) setIndice(null)
  }

  async function handleRemoverFoto(url) {
    if (!window.confirm('Remover esta imagem da galeria?')) return
    setErro(null)
    setRemovendo(url)
    try {
      const atualizado = await removerImagemGaleriaLoja(loja.id, url)
      onGaleriaChange(atualizado.galeria || [])
    } catch (err) {
      setErro(err?.message || 'Erro ao remover imagem.')
    } finally {
      setRemovendo(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{nome} — Galeria ({imagens.length})</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        {erro && <div className="error-msg" style={{ margin: '0.75rem 1.25rem 0' }}>{erro}</div>}

        {indice === null ? (
          <>
            <div className="galeria-toolbar">
              <label className="btn-secondary" style={{ width: 'auto', cursor: 'pointer' }}>
                {enviando ? 'Enviando...' : '+ Adicionar fotos'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAdicionarFotos}
                  disabled={enviando}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div className="galeria-grid">
              {imagens.map((url, i) => (
                <div className="galeria-thumb-wrapper" key={url}>
                  <ThumbImg
                    src={url}
                    alt={`${nome} — foto ${i + 1}`}
                    onClick={() => setIndice(i)}
                    onIndisponivel={() => handleImagemIndisponivel(url)}
                  />
                  <button
                    className="galeria-thumb-remove"
                    title="Remover imagem da galeria"
                    disabled={removendo === url}
                    onClick={(e) => { e.stopPropagation(); handleRemoverFoto(url) }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="lightbox-toolbar">
              <button className="lightbox-back" onClick={() => setIndice(null)}>← Voltar à grade</button>
              <button
                className="lightbox-back"
                style={{ color: 'var(--danger)', marginLeft: 'auto' }}
                disabled={removendo === imagens[indice]}
                onClick={() => handleRemoverFoto(imagens[indice])}
              >
                Remover esta imagem
              </button>
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
              alt={`${nome} — foto ${indice + 1}`}
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

function FotoCell({ loja, onEditarImagem, onGaleriaChange }) {
  const [galeriaAberta, setGaleriaAberta] = useState(false)
  const imagens = [loja.imagemUrl, ...(loja.galeria || [])].filter(Boolean)

  return (
    <>
      <div
        className="avatar-wrapper clickable"
        onClick={() => setGaleriaAberta(true)}
        title="Ver/gerenciar galeria de imagens"
      >
        <Avatar src={loja.imagemUrl} nome={loja.nome} />
        {imagens.length > 1 && <span className="avatar-badge">{imagens.length}</span>}
        <button
          className="avatar-edit-btn"
          title="Editar imagem principal"
          onClick={(e) => { e.stopPropagation(); onEditarImagem(loja) }}
        >
          <Icon name="edit" size={10} />
        </button>
      </div>
      {galeriaAberta && (
        <GaleriaModal
          loja={loja}
          onGaleriaChange={(novaGaleria) => onGaleriaChange(loja.id, novaGaleria)}
          onClose={() => setGaleriaAberta(false)}
        />
      )}
    </>
  )
}

function badgeClass(status) {
  if (status === 'ATIVA') return 'badge badge-success'
  if (status === 'SUSPENSA') return 'badge badge-danger'
  if (status === 'INATIVA') return 'badge badge-muted'
  return 'badge badge-muted'
}

const FILTROS_STATUS = ['Todas', 'ATIVA', 'INATIVA', 'SUSPENSA']

export default function Lojas() {
  const [lojas, setLojas] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todas')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [atualizando, setAtualizando] = useState(null)
  const [editando, setEditando] = useState(null)
  const [editandoImagem, setEditandoImagem] = useState(null)

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

  async function handleSalvarEdicao(loja, valores) {
    await atualizarLoja(loja.id, { nome: valores.nome, descricao: valores.descricao })
    setLojas(prev =>
      prev.map(l => l.id === loja.id ? { ...l, nome: valores.nome, descricao: valores.descricao } : l)
    )
    setEditando(null)
  }

  async function handleUploadImagem(file) {
    const atualizado = await enviarImagemLoja(editandoImagem.id, file)
    setLojas(prev => prev.map(l => l.id === editandoImagem.id ? { ...l, imagemUrl: atualizado.imagemUrl } : l))
    setEditandoImagem(prev => prev ? { ...prev, imagemUrl: atualizado.imagemUrl } : prev)
  }

  async function handleRemoverImagem() {
    const atualizado = await removerImagemLoja(editandoImagem.id)
    setLojas(prev => prev.map(l => l.id === editandoImagem.id ? { ...l, imagemUrl: atualizado.imagemUrl } : l))
    setEditandoImagem(prev => prev ? { ...prev, imagemUrl: atualizado.imagemUrl } : prev)
  }

  function handleGaleriaChange(lojaId, novaGaleria) {
    setLojas(prev => prev.map(l => l.id === lojaId ? { ...l, galeria: novaGaleria } : l))
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
                  <th>Foto</th>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Comerciante</th>
                  <th>Status</th>
                  <th>Data Cadastro</th>
                  <th>Editar</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lojasFiltradas.map(loja => {
                  const descricao = loja.descricao?.length > 60
                    ? loja.descricao.substring(0, 60) + '...'
                    : loja.descricao
                  return (
                  <tr key={loja.id}>
                    <td><FotoCell loja={loja} onEditarImagem={setEditandoImagem} onGaleriaChange={handleGaleriaChange} /></td>
                    <td>#{loja.id}</td>
                    <td>{loja.nome || '—'}</td>
                    <td style={{ maxWidth: 220 }}>{descricao || '—'}</td>
                    <td>{loja.comerciante?.nome || '—'}</td>
                    <td><span className={badgeClass(loja.statusLoja)}>{loja.statusLoja}</span></td>
                    <td>{loja.dataCadastro ? new Date(loja.dataCadastro).toLocaleDateString('pt-BR') : '—'}</td>
                    <td>
                      <button
                        className="btn-icon btn-secondary"
                        title="Editar"
                        onClick={() => setEditando(loja)}
                      >
                        <Icon name="edit" />
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {loja.statusLoja === 'ATIVA' && (
                          <button
                            className="btn-icon btn-secondary"
                            title="Inativar"
                            disabled={atualizando === loja.id}
                            onClick={() => handleMudarStatus(loja, 'INATIVA')}
                          >
                            <Icon name="pause" />
                          </button>
                        )}
                        {loja.statusLoja === 'INATIVA' && (
                          <button
                            className="btn-icon btn-secondary"
                            title="Ativar"
                            disabled={atualizando === loja.id}
                            onClick={() => handleMudarStatus(loja, 'ATIVA')}
                          >
                            <Icon name="play" />
                          </button>
                        )}
                        {loja.statusLoja !== 'SUSPENSA' && (
                          <button
                            className="btn-icon btn-danger"
                            title="Suspender"
                            disabled={atualizando === loja.id}
                            onClick={() => handleMudarStatus(loja, 'SUSPENSA')}
                          >
                            <Icon name="ban" />
                          </button>
                        )}
                        {loja.statusLoja === 'SUSPENSA' && (
                          <button
                            className="btn-icon btn-secondary"
                            title="Reativar"
                            disabled={atualizando === loja.id}
                            onClick={() => handleMudarStatus(loja, 'ATIVA')}
                          >
                            <Icon name="rotate" />
                          </button>
                        )}
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
          title={`Editar loja — ${editando.nome || '#' + editando.id}`}
          fields={[
            { name: 'nome', label: 'Nome' },
            { name: 'descricao', label: 'Descrição', type: 'textarea' },
          ]}
          initialValues={editando}
          onSave={(valores) => handleSalvarEdicao(editando, valores)}
          onClose={() => setEditando(null)}
        />
      )}

      {editandoImagem && (
        <EditarImagemModal
          title={`Imagem — ${editandoImagem.nome || '#' + editandoImagem.id}`}
          imagemUrl={editandoImagem.imagemUrl}
          onUpload={handleUploadImagem}
          onRemover={handleRemoverImagem}
          onClose={() => setEditandoImagem(null)}
        />
      )}
    </div>
  )
}
