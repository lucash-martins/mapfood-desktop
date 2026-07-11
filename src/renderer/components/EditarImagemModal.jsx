import React, { useState, useEffect } from 'react'
import { resolveImagemUrl } from '../services/api'

export default function EditarImagemModal({ title, imagemUrl, onUpload, onRemover, onClose }) {
  const [enviando, setEnviando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const [erro, setErro] = useState(null)
  const [erroImagem, setErroImagem] = useState(false)
  const url = resolveImagemUrl(imagemUrl)

  useEffect(() => { setErroImagem(false) }, [imagemUrl])

  async function handleArquivo(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErro(null)
    setEnviando(true)
    try {
      await onUpload(file)
    } catch (err) {
      setErro(err?.message || 'Erro ao enviar imagem.')
    } finally {
      setEnviando(false)
    }
  }

  async function handleRemover() {
    if (!window.confirm('Remover esta imagem?')) return
    setErro(null)
    setRemovendo(true)
    try {
      await onRemover()
    } catch (err) {
      setErro(err?.message || 'Erro ao remover imagem.')
    } finally {
      setRemovendo(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel modal-panel-form" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal-body">
          {erro && <div className="error-msg">{erro}</div>}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {url && !erroImagem ? (
              <img
                key={url}
                src={url}
                alt=""
                style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, objectFit: 'cover' }}
                onError={() => setErroImagem(true)}
              />
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>
                {url ? 'Imagem indisponível.' : 'Sem imagem cadastrada.'}
              </p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="nova-imagem">Nova imagem</label>
            <input id="nova-imagem" type="file" accept="image/*" onChange={handleArquivo} disabled={enviando || removendo} />
          </div>
        </div>
        <div className="modal-actions">
          {imagemUrl && (
            <button
              type="button"
              className="btn-danger"
              style={{ width: 'auto', marginRight: 'auto' }}
              onClick={handleRemover}
              disabled={enviando || removendo}
            >
              {removendo ? 'Removendo...' : 'Remover imagem'}
            </button>
          )}
          <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
