import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin } from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const data = await loginAdmin(email, senha)
      const token = data?.token || data?.accessToken || data?.access_token
      const nome = data?.nome || data?.name || data?.email || email

      if (!token) {
        throw new Error('Token não recebido na resposta do servidor')
      }

      await window.electronAPI?.auth.salvarToken(token, nome)
      window.electronAPI?.sync.forcarSync()
      navigate('/dashboard')
    } catch (err) {
      if (err.status === 401) {
        setErro('Email ou senha inválidos')
      } else if (err.status === 403) {
        setErro('Acesso negado: conta sem permissão de administrador')
      } else if (err.message) {
        setErro(err.message)
      } else {
        setErro('Erro ao conectar com o servidor. Verifique se o backend está rodando.')
      }
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">🍔</div>
        <h1 className="login-title">MapFood Admin</h1>
        <p className="login-subtitle">Painel Administrativo</p>

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
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={carregando}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}