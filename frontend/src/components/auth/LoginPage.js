import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeSlash, ArrowRight } from '@phosphor-icons/react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : Array.isArray(d) ? d.map(e => e.msg || JSON.stringify(e)).join(' ') : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] items-center justify-center p-16">
        <div>
          <div className="uppercase text-xs tracking-[0.3em] font-bold text-[#002FA7] mb-6">Control Plane</div>
          <h1 className="font-heading text-5xl font-black text-white leading-tight mb-4">STRATUM</h1>
          <p className="font-body text-slate-400 text-lg max-w-md">Unified governance and orchestration layer for multi-agent AI systems.</p>
          <div className="mt-12 grid grid-cols-2 gap-4">
            {['Agent Registry', 'Policy Engine', 'Cost Tracking', 'HITL Gates'].map(f => (
              <div key={f} className="border border-slate-700 p-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <div className="uppercase text-xs tracking-[0.3em] font-bold text-[#002FA7] mb-2">Control Plane</div>
            <h1 className="font-heading text-3xl font-black">STRATUM</h1>
          </div>

          <h2 className="font-heading text-2xl font-bold mb-1" data-testid="login-title">Sign in</h2>
          <p className="font-body text-sm text-slate-500 mb-8">Access your agent control plane</p>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 mb-4" data-testid="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Email</label>
              <input data-testid="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full border border-slate-300 p-2.5 text-sm font-body focus:outline-none focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7]" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input data-testid="login-password" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full border border-slate-300 p-2.5 text-sm font-body focus:outline-none focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button data-testid="login-submit" type="submit" disabled={loading}
              className="w-full bg-[#002FA7] text-white font-bold text-sm uppercase tracking-wider p-3 hover:bg-[#002080] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? 'Signing in...' : <><span>Sign in</span><ArrowRight size={16} weight="bold" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 font-body">
            No account? <Link to="/register" className="text-[#002FA7] font-semibold hover:underline" data-testid="goto-register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
