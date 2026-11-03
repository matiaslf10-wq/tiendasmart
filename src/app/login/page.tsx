'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage('Ingresando...');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const connectionError = /fetch|network|load failed/i.test(error.message);
        setMessage(connectionError
          ? 'No pudimos conectar con el servicio de acceso. Intentá nuevamente en unos minutos.'
          : error.code === 'invalid_credentials'
            ? 'El email o la contraseña son incorrectos.'
            : 'No se pudo iniciar sesión. Revisá tus datos e intentá nuevamente.');
        return;
      }

      router.replace('/admin');
      router.refresh();
    } catch {
      setMessage('No pudimos conectar con el servicio de acceso. Revisá tu conexión e intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleLogin} className="w-full max-w-md space-y-4 rounded-2xl border p-6">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>

        <input
          className="w-full rounded-xl border px-4 py-3"
          aria-label="Email"
          autoComplete="username"
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="relative">
          <input
            className="w-full rounded-xl border px-4 py-3 pr-14"
            id="login-password"
            aria-label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPassword}
            aria-controls="login-password"
            onClick={() => setShowPassword((visible) => !visible)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {showPassword && <path d="m3 3 18 18" />}
            </svg>
          </button>
        </div>

        <button
          className="w-full rounded-xl bg-black text-white py-3 disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Ingresando...' : 'Entrar'}
        </button>

        {message && <p role="status" aria-live="polite" className="text-sm text-gray-700">{message}</p>}
      </form>
    </main>
  );
}