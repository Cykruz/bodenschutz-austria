'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { admin, describeError, IS_MOCK } from '@/lib/api';
import { fieldErrors, loginSchema } from '@/lib/schema';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { Logo } from '@/components/home/Logo';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setError(null);
    setLoading(true);
    try {
      await admin.login(parsed.data.email, parsed.data.password);
      const weiter = params.get('weiter');
      router.replace(weiter && weiter.startsWith('/admin') && weiter !== '/admin/login' ? weiter : '/admin');
    } catch (err) {
      setError(describeError(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="karte w-full max-w-md p-6 sm:p-8" noValidate>
      <div className="flex items-center gap-3">
        <Logo className="size-10" />
        <div>
          <p className="text-sm font-bold tracking-wide text-terracotta-text uppercase">Bodenschutz Austria</p>
          <h1 className="text-2xl">Anmeldung Verwaltung</h1>
        </div>
      </div>
      {IS_MOCK && (
        <Notice tone="info" className="mt-4">
          Vorführmodus: beliebige E-Mail und beliebiges Passwort eingeben.
        </Notice>
      )}
      {error && (
        <Notice tone="error" className="mt-4">
          {error}
        </Notice>
      )}
      <div className="mt-6 space-y-5">
        <Field label="E-Mail" required error={errors.email}>
          {(p) => <Input {...p} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Passwort" required error={errors.password}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
      </div>
      <Button type="submit" size="lg" className="mt-6 w-full" loading={loading} icon={<LogIn className="size-5" aria-hidden />}>
        Anmelden
      </Button>
      <p className="mt-4 text-center text-sm text-text/80">Zugang nur für den Betreiber. Zugriffe werden begrenzt und protokolliert.</p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
