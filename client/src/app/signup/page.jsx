'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message || 'Could not create your account');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Start mapping"
      subtitle="Create an account and get a blank board in a few seconds."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-melon-600 hover:text-melon-700">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          id="name"
          name="name"
          label="Name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={form.name}
          onChange={onChange}
          required
        />

        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={onChange}
          required
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          hint="Use 8 or more characters."
          value={form.password}
          onChange={onChange}
          required
        />

        {error && (
          <p role="alert" className="rounded-xl bg-melon-50 px-3 py-2 text-[13px] text-melon-700">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
