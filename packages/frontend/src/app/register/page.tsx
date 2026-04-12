'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Bot, AlertTriangle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다');
      }

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-argos-bg">
      <div className="bg-argos-surface backdrop-blur p-8 rounded-xl border border-argos-border w-full max-w-md shadow-argos-raised">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 !text-white" />
          </div>
          <h1 className="text-2xl font-bold text-argos-ink">ARGOS</h1>
          <p className="text-argos-muted mt-2">회원가입</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-argos-dangerBg border border-argos-danger/30 text-argos-dangerInk px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-argos-warningBg border border-argos-warning/30 text-argos-warningInk px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            사전 승인된 이메일만 가입 가능합니다
          </div>

          <div>
            <label className="block text-sm font-medium text-argos-inkSoft mb-2">
              이메일
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-argos-bg border border-argos-border rounded-lg px-4 py-2.5 text-argos-ink placeholder-argos-faint focus:outline-none focus:border-argos-blue transition-colors"
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
              className="w-full bg-argos-bg border border-argos-border rounded-lg px-4 py-2.5 text-argos-ink placeholder-argos-faint focus:outline-none focus:border-argos-blue transition-colors"
              placeholder="6자 이상"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-argos-inkSoft mb-2">
              비밀번호 확인
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-argos-bg border border-argos-border rounded-lg px-4 py-2.5 text-argos-ink placeholder-argos-faint focus:outline-none focus:border-argos-blue transition-colors"
              placeholder="비밀번호 재입력"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 !text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                가입 중...
              </>
            ) : (
              '회원가입'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-argos-muted">
          <p>
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-argos-blue hover:text-argos-blueHover transition-colors">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
