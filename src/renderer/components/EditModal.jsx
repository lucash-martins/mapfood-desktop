import React, { useState } from 'react'

export default function EditModal({ title, fields, initialValues, onSave, onClose }) {
  const [values, setValues] = useState(() => {
    const v = {}
    for (const f of fields) v[f.name] = initialValues?.[f.name] ?? ''
    return v
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  function handleChange(name, value) {
    setValues(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    try {
      await onSave(values)
    } catch (err) {
      setErro(err?.message || 'Erro ao salvar.')
      setSalvando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel modal-panel-form" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {erro && <div className="error-msg">{erro}</div>}
            {fields.map(f => (
              <div className="form-group" key={f.name}>
                <label htmlFor={f.name}>{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    id={f.name}
                    value={values[f.name]}
                    onChange={e => handleChange(f.name, e.target.value)}
                    rows={f.rows || 4}
                  />
                ) : f.type === 'select' ? (
                  <select
                    id={f.name}
                    value={values[f.name]}
                    onChange={e => handleChange(f.name, e.target.value)}
                  >
                    {f.options.map(opt => (
                      <option key={opt.value ?? opt} value={opt.value ?? opt}>
                        {opt.label ?? opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={f.name}
                    type={f.type || 'text'}
                    value={values[f.name]}
                    onChange={e => handleChange(f.name, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={salvando} style={{ width: 'auto' }}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={salvando} style={{ width: 'auto' }}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
