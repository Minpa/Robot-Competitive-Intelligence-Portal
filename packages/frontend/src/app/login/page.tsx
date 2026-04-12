'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Bot, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '로그인에 실패했습니다');
      }

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      await new Promise(resolve => setTimeout(resolve, 100));
      window.location.href = '/executive';
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-argos-bg relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-argos-blue/5 rounded-full blur-[120px]" />

      {/* AWE2026 Banner */}
      <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex items-center gap-2 bg-argos-chip/60 border border-argos-blue/20 rounded-full px-5 py-2">
          <Sparkles className="w-4 h-4 text-argos-blue" />
          <span className="text-sm font-medium text-argos-blue">AWE 2026 Edition</span>
          <span className="text-xs text-argos-faint ml-1">|</span>
          <span className="text-xs text-argos-muted ml-1">38+ Humanoid Robots Tracked</span>
        </div>
      </div>

      <div className={`bg-argos-surface backdrop-blur-xl p-8 rounded-2xl border border-argos-border w-full max-w-md shadow-argos-raised relative z-10 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <Bot className="w-8 h-8 !text-white" />
          </div>
          <h1 className="text-2xl font-bold text-argos-ink tracking-tight">ARGOS</h1>
          <p className="text-argos-muted mt-1 text-sm">Autonomous Robot Global Observatory System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-argos-dangerBg border border-argos-danger/30 text-argos-dangerInk px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-argos-inkSoft mb-2">
              이메일
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-argos-bg border border-argos-border rounded-lg px-4 py-2.5 text-argos-ink placeholder-argos-faint focus:outline-none focus:border-argos-blue focus:ring-1 focus:ring-argos-blue/50 transition-all"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-argos-inkSoft mb-2">
              비밀번호
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-argos-bg border border-argos-border rounded-lg px-4 py-2.5 text-argos-ink placeholder-argos-faint focus:outline-none focus:border-argos-blue focus:ring-1 focus:ring-argos-blue/50 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 !text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                로그인 중...
              </>
            ) : (
              '로그인'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-argos-muted">
          <p>허가된 사용자만 접근 가능합니다</p>
          <p className="mt-2">
            계정이 없으신가요?{' '}
            <a href="/register" className="text-argos-blue hover:text-argos-blueHover transition-colors">
              회원가입
            </a>
          </p>
        </div>
      </div>

      {/* Stats footer */}
      <div className={`mt-8 flex items-center gap-6 text-xs text-argos-faint transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <span>24 Companies</span>
        <span className="w-1 h-1 bg-argos-border rounded-full" />
        <span>38+ Robots</span>
        <span className="w-1 h-1 bg-argos-border rounded-full" />
        <span>6 Regions</span>
        <span className="w-1 h-1 bg-argos-border rounded-full" />
        <span>Real-time CI</span>
      </div>
    </div>
  );
}
