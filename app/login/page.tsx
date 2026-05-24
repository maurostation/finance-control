'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/supabase';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await signIn(email, password);
    if (err) {
      setError('Email ou senha incorretos');
      setLoading(false);
    } else {
      router.push('/');
    }
  }

  return (
    <div style={{
      minHeight:'100svh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)', padding:'20px',
      position:'relative', overflow:'hidden',
    }}>
      {/* Glow */}
      <div style={{
        position:'absolute', top:'-100px', right:'-100px', width:500, height:500,
        borderRadius:'50%', pointerEvents:'none',
        background:'radial-gradient(circle, rgba(245,158,11,.08) 0%, transparent 65%)',
      }} />
      <div style={{
        position:'absolute', bottom:'-80px', left:'-80px', width:400, height:400,
        borderRadius:'50%', pointerEvents:'none',
        background:'radial-gradient(circle, rgba(217,119,6,.05) 0%, transparent 65%)',
      }} />

      <div style={{ width:'100%', maxWidth:380, position:'relative', zIndex:1 }}>
        {/* Logo mark */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{
            width:52, height:52, borderRadius:14, background:'var(--a)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 16px',
            boxShadow:'0 4px 20px rgba(217,119,6,.3)',
          }}>
            <Lock size={22} color="#fff" />
          </div>
          <h1 style={{ fontSize:'1.4rem', fontWeight:700, letterSpacing:'-.03em', color:'var(--tx)', marginBottom:6 }}>
            Finance Hub
          </h1>
          <p style={{ fontSize:'.84rem', color:'var(--tx-3)' }}>
            Sua central financeira pessoal
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:'.78rem', color:'var(--tx-3)', display:'block', marginBottom:6 }}>Email</label>
            <input
              className="input"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label style={{ fontSize:'.78rem', color:'var(--tx-3)', display:'block', marginBottom:6 }}>Senha</label>
            <div style={{ position:'relative' }}>
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight:'44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'var(--tx-4)',
                  display:'flex', alignItems:'center',
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p style={{
              fontSize:'.82rem', color:'var(--red)', padding:'10px 12px',
              background:'var(--red-dim)', borderRadius:8, border:'1px solid rgba(239,68,68,.18)',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-amber"
            disabled={loading}
            style={{ width:'100%', justifyContent:'center', marginTop:4, padding:'.8rem' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ marginTop:24, textAlign:'center', fontSize:'.78rem', color:'var(--tx-4)', fontFamily:"'Geist Mono',monospace", letterSpacing:'.04em' }}>
          Acesso privado · Finance Hub
        </p>
      </div>
    </div>
  );
}
