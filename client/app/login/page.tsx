'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      const { token, user } = res.data;
      setAuth(user, token);
      toast.success(`Welcome back, ${user.name}!`);
      router.push(user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 animate-pulse"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent)', animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4"
            style={{ background: 'var(--gradient-primary)', boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}
          >
            <span className="text-4xl">🎓</span>
          </motion.div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            <span className="gradient-text">Dhyanee</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            AI-Powered Learning Platform
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <motion.button
              id="login-btn"
              type="submit"
              className="btn-primary w-full justify-center"
              whileTap={{ scale: 0.98 }}
              disabled={loading}
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
              ) : 'Sign In'}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t text-center" style={{ borderColor: 'var(--bg-border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium" style={{ color: 'var(--primary-light)' }}>
                Create one
              </Link>
            </p>
          </div>

          {/* Demo hint */}
          <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--primary-light)' }}>Demo Admin:</strong> admin@dhyanee.com / Admin@1234
            <br />
            <span className="text-xs">(Run POST /api/auth/seed-admin first to create admin)</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
