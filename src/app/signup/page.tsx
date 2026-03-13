'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage('Creando cuenta...');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    console.log('SIGNUP DATA:', data);
    console.log('SIGNUP ERROR:', error);

    if (error) {
      setMessage(`Error: ${error.message}`);
      setLoading(false);
      return;
    }

    if (data.user) {
      setMessage(`Cuenta creada correctamente. User ID: ${data.user.id}`);
    } else {
      setMessage('No hubo error, pero no se devolvió usuario.');
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSignup} className="w-full max-w-md space-y-4 rounded-2xl border p-6">
        <h1 className="text-2xl font-bold">Crear cuenta</h1>

        <input
          className="w-full rounded-xl border px-4 py-3"
          type="text"
          placeholder="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          className="w-full rounded-xl border px-4 py-3"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full rounded-xl border px-4 py-3"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="w-full rounded-xl bg-black text-white py-3 disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creando...' : 'Registrarme'}
        </button>

        {message && <p className="text-sm text-gray-700">{message}</p>}
      </form>
    </main>
  );
}