import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin, recuperarSenha, redefinirSenha } from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  // etapa: 'login' | 'solicitar' (pedir o email) | 'redefinir' (informar token + nova senha)
  const [etapa, setEtapa] = useState('login')

  const [emailRecuperar, setEmailRecuperar] = useState('')
  const [erroRecuperar, setErroRecuperar] = useState('')
  const [sucessoRecuperar, setSucessoRecuperar] = useState('')
  const [enviandoRecuperar, setEnviandoRecuperar] = useState(false)

  const [tokenRedefinir, setTokenRedefinir] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erroRedefinir, setErroRedefinir] = useState('')
  const [sucessoRedefinir, setSucessoRedefinir] = useState('')
  const [redefinindo, setRedefinindo] = useState(false)

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

  function abrirRecuperar() {
    setErro('')
    setEmailRecuperar(email)
    setErroRecuperar('')
    setSucessoRecuperar('')
    setEtapa('solicitar')
  }

  function voltarParaLogin() {
    setEtapa('login')
    setErroRecuperar('')
    setSucessoRecuperar('')
    setTokenRedefinir('')
    setNovaSenha('')
    setConfirmarSenha('')
    setErroRedefinir('')
    setSucessoRedefinir('')
  }

  async function handleRecuperarSubmit(e) {
    e.preventDefault()
    setErroRecuperar('')
    setSucessoRecuperar('')
    setEnviandoRecuperar(true)

    try {
      await recuperarSenha(emailRecuperar)
      setSucessoRecuperar('Se o email informado estiver cadastrado, enviamos um código de redefinição para ele.')
    } catch (err) {
      if (err.message) {
        setErroRecuperar(err.message)
      } else {
        setErroRecuperar('Erro ao conectar com o servidor. Verifique se o backend está rodando.')
      }
    } finally {
      setEnviandoRecuperar(false)
    }
  }

  function irParaRedefinir() {
    setErroRedefinir('')
    setSucessoRedefinir('')
    setEtapa('redefinir')
  }

  async function handleRedefinirSubmit(e) {
    e.preventDefault()
    setErroRedefinir('')
    setSucessoRedefinir('')

    if (novaSenha !== confirmarSenha) {
      setErroRedefinir('As senhas não coincidem')
      return
    }

    setRedefinindo(true)
    try {
      await redefinirSenha(tokenRedefinir, novaSenha)
      setSucessoRedefinir('Senha redefinida com sucesso. Você já pode entrar com a nova senha.')
    } catch (err) {
      if (err.message) {
        setErroRedefinir(err.message)
      } else {
        setErroRedefinir('Erro ao conectar com o servidor. Verifique se o backend está rodando.')
      }
    } finally {
      setRedefinindo(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">🍔</div>
        <h1 className="login-title">MapFood Admin</h1>
        <p className="login-subtitle">Painel Administrativo</p>

        {etapa === 'login' && (
          <>
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

            <button type="button" className="btn-link" onClick={abrirRecuperar}>
              Esqueci minha senha
            </button>
          </>
        )}

        {etapa === 'solicitar' && (
          <>
            <form className="login-form" onSubmit={handleRecuperarSubmit}>
              <p className="login-recuperar-info">
                Informe o email cadastrado e enviaremos um código para redefinir sua senha.
              </p>

              {erroRecuperar && <div className="error-msg">{erroRecuperar}</div>}
              {sucessoRecuperar && <div className="success-msg">{sucessoRecuperar}</div>}

              <div className="form-group">
                <label htmlFor="emailRecuperar">Email</label>
                <input
                  id="emailRecuperar"
                  type="email"
                  placeholder="admin@mapfood.com"
                  value={emailRecuperar}
                  onChange={(e) => setEmailRecuperar(e.target.value)}
                  required
                  autoFocus
                  disabled={!!sucessoRecuperar}
                />
              </div>

              {!sucessoRecuperar && (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={enviandoRecuperar}
                >
                  {enviandoRecuperar ? 'Enviando...' : 'Enviar código de recuperação'}
                </button>
              )}
            </form>

            {sucessoRecuperar && (
              <button type="button" className="btn-primary" onClick={irParaRedefinir}>
                Já tenho o código
              </button>
            )}

            <button type="button" className="btn-link" onClick={voltarParaLogin}>
              Voltar para o login
            </button>
          </>
        )}

        {etapa === 'redefinir' && (
          <>
            <form className="login-form" onSubmit={handleRedefinirSubmit}>
              <p className="login-recuperar-info">
                Informe o código recebido por email e sua nova senha.
              </p>

              {erroRedefinir && <div className="error-msg">{erroRedefinir}</div>}
              {sucessoRedefinir && <div className="success-msg">{sucessoRedefinir}</div>}

              <div className="form-group">
                <label htmlFor="tokenRedefinir">Código</label>
                <input
                  id="tokenRedefinir"
                  type="text"
                  placeholder="Código recebido por email"
                  value={tokenRedefinir}
                  onChange={(e) => setTokenRedefinir(e.target.value)}
                  required
                  autoFocus
                  disabled={!!sucessoRedefinir}
                />
              </div>

              <div className="form-group">
                <label htmlFor="novaSenha">Nova senha</label>
                <input
                  id="novaSenha"
                  type="password"
                  placeholder="••••••••"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  minLength={6}
                  disabled={!!sucessoRedefinir}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmarSenha">Confirmar nova senha</label>
                <input
                  id="confirmarSenha"
                  type="password"
                  placeholder="••••••••"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                  minLength={6}
                  disabled={!!sucessoRedefinir}
                />
              </div>

              {!sucessoRedefinir && (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={redefinindo}
                >
                  {redefinindo ? 'Redefinindo...' : 'Redefinir senha'}
                </button>
              )}
            </form>

            <button type="button" className="btn-link" onClick={voltarParaLogin}>
              Voltar para o login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
