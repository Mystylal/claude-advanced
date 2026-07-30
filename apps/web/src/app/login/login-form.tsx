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
import { ApiError, loginUser } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { PasswordField } from '@/components/password-field';

export function LoginForm() {
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
      const { accessToken } = await loginUser(email, password);
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
        <Card.Title>Welcome back</Card.Title>
        <Card.Description>
          Log in with your email and password to continue.
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
            placeholder="Your password"
            autoComplete="current-password"
            isRequired
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
            {isSubmitting ? <Spinner size="sm" /> : 'Log in'}
          </Button>

          <p className="text-center text-sm text-foreground/60">
            Don&apos;t have an account? <Link href="/register">Sign up</Link>
          </p>
        </Form>
      </Card.Content>
    </Card>
  );
}
