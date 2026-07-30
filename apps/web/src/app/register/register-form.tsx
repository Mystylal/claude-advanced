'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  Spinner,
  TextField,
} from '@heroui/react';
import { ApiError, registerUser } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { PasswordField } from '@/components/password-field';

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { accessToken } = await registerUser(email, password);
      saveSession(accessToken, email);
      router.push('/');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the server. Please try again.',
      );
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <Card.Header>
        <Card.Title>Create your account</Card.Title>
        <Card.Description>
          Sign up with your email and a password to get started.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Form
          className="flex flex-col gap-4"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <TextField
            name="email"
            type="email"
            autoComplete="email"
            isRequired
            value={email}
            onChange={setEmail}
            isDisabled={isSubmitting}
          >
            <Label>Email</Label>
            <Input placeholder="you@example.com" />
            <FieldError />
          </TextField>

          <PasswordField
            label="Password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            isRequired
            minLength={8}
            value={password}
            onChange={setPassword}
            isDisabled={isSubmitting}
          />

          {error ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isDisabled={isSubmitting}
          >
            {isSubmitting ? <Spinner size="sm" /> : 'Create account'}
          </Button>

          <p className="text-center text-sm text-foreground/60">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </Form>
      </Card.Content>
    </Card>
  );
}
