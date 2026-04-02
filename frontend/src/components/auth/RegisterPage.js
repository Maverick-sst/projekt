import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight } from '@phosphor-icons/react';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name);
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : Array.isArray(d) ? d.map(e => e.msg || JSON.stringify(e)).join(' ') : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      <div className="w-full max-w-sm">
        <div className="uppercase text-xs tracking-[0.3em] font-bold text-[#002FA7] mb-2">Control Plane</div>
        <h1 className="font-heading text-3xl font-black mb-1">STRATUM</h1>
        <h2 className="font-heading text-xl font-bold mb-1 mt-6" data-testid="register-title">Create account</h2>
        <p className="font-body text-sm text-slate-500 mb-6">Join the agent control plane</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 mb-4" data-testid="register-error">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Name</label>
            <input data-testid="register-name" type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full border border-slate-300 p-2.5 text-sm font-body focus:outline-none focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7]" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Email</label>
            <input data-testid="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-slate-300 p-2.5 text-sm font-body focus:outline-none focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7]" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Password</label>
            <input data-testid="register-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full border border-slate-300 p-2.5 text-sm font-body focus:outline-none focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7]" />
          </div>
          <button data-testid="register-submit" type="submit" disabled={loading}
            className="w-full bg-[#002FA7] text-white font-bold text-sm uppercase tracking-wider p-3 hover:bg-[#002080] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? 'Creating...' : <><span>Create account</span><ArrowRight size={16} weight="bold" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 font-body">
          Have an account? <Link to="/login" className="text-[#002FA7] font-semibold hover:underline" data-testid="goto-login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
