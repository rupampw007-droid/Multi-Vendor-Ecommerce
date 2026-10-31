'use client';

import { ArrowRight, LockKeyhole, Store } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/axiosInstance';
import { useToast } from '@/shared/components/toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await axiosInstance.post('/api/login-admin', {
        email: email.trim().toLowerCase(),
        password,
      });
      toast('Signed in successfully.');
      router.replace('/dashboard');
    } catch (requestError) {
      const errorResponse = requestError as {
        response?: { data?: { message?: string } };
      };
      const message =
        errorResponse.response?.data?.message ??
        (requestError instanceof Error
          ? requestError.message
          : 'Unable to sign in.');
      setError(message);
      toast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-mark">m</span>
          <div>
            <strong>market</strong>
            <span>ADMIN CONSOLE</span>
          </div>
        </div>
        <div className="login-icon"><LockKeyhole size={21} /></div>
        <div className="login-heading">
          <div className="eyebrow">WELCOME BACK</div>
          <h1>Sign in to your workspace</h1>
          <p>Use your administrator account to continue.</p>
        </div>
        <form className="login-form" onSubmit={(event) => void submit(event)}>
          <label className="form-field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary login-submit" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>
        <div className="login-security"><Store size={14} /> Secure marketplace access</div>
      </section>
      <p className="login-caption">A clear view of your marketplace, all in one place.</p>
    </main>
  );
}
