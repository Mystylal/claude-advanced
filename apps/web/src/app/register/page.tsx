import type { Metadata } from 'next';
import { RegisterForm } from './register-form';

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Sign up with your email and a password to get started.',
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-white to-zinc-100 px-4 py-12">
      <RegisterForm />
    </main>
  );
}
