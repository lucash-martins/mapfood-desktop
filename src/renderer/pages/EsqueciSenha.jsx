import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { esqueciSenhaAdmin } from '../services/api'

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await esqueciSenhaAdmin(email)
      setEnviado(true)
    } catch (err) {
      setErro(err.message || 'Erro ao solicitar redefinição de senha.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">🔑</div>
        <h1 className="login-title">Esqueceu sua senha?</h1>
        <p className="login-subtitle">Painel Administrativo</p>

        {enviado ? (
          <>
            <p style={{ textAlign: 'center', color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Se <strong>{email}</strong> estiver cadastrado como administrador, enviamos um link de redefinição.
              Abra o link em um navegador (o link vale por 30 minutos) e depois volte aqui para entrar com a nova senha.
            </p>
            <Link to="/login" className="btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Voltar para o login
            </Link>
          </>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {erro && <div className="error-msg">{erro}</div>}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="admin@mapfood.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={carregando}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={carregando}>
              {carregando ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>

            <Link
              to="/login"
              style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}
            >
              Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
