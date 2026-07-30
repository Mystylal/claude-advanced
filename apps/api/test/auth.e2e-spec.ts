import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface AuthResponseBody {
  accessToken: string;
}

function uniqueEmail(): string {
  return `e2e-${randomUUID()}@example.com`;
}

const VALID_PASSWORD = 'correct-horse-battery-staple';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const register = (email: string, password: string) =>
    request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password });

  const login = (email: string, password: string) =>
    request(app.getHttpServer()).post('/auth/login').send({ email, password });

  describe('POST /auth/register', () => {
    it('creates a new user and returns an accessToken', async () => {
      const email = uniqueEmail();

      const response = await register(email, VALID_PASSWORD);
      const body = response.body as AuthResponseBody;

      expect(response.status).toBe(201);
      expect(typeof body.accessToken).toBe('string');
      expect(body.accessToken.length).toBeGreaterThan(0);
    });

    it('persists the user so they can subsequently log in', async () => {
      const email = uniqueEmail();
      await register(email, VALID_PASSWORD).expect(201);

      const response = await login(email, VALID_PASSWORD);
      const body = response.body as AuthResponseBody;

      expect(response.status).toBe(200);
      expect(typeof body.accessToken).toBe('string');
    });

    it('rejects registration with an email that is already taken', async () => {
      const email = uniqueEmail();
      await register(email, VALID_PASSWORD).expect(201);

      const response = await register(email, VALID_PASSWORD);

      expect(response.status).toBe(409);
    });

    it('rejects registration with a missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: VALID_PASSWORD });

      expect(response.status).toBe(400);
    });

    it('rejects registration with a missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: uniqueEmail() });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns an accessToken for a registered user with correct credentials', async () => {
      const email = uniqueEmail();
      await register(email, VALID_PASSWORD).expect(201);

      const response = await login(email, VALID_PASSWORD);
      const body = response.body as AuthResponseBody;

      expect(response.status).toBe(200);
      expect(typeof body.accessToken).toBe('string');
      expect(body.accessToken.length).toBeGreaterThan(0);
    });

    it('rejects an email that was never registered, without creating a user', async () => {
      const email = uniqueEmail();

      const loginResponse = await login(email, VALID_PASSWORD);
      expect(loginResponse.status).toBe(401);

      // Login must never create an account: the same email is still free to register.
      const registerResponse = await register(email, VALID_PASSWORD);
      expect(registerResponse.status).toBe(201);
    });

    it('rejects an incorrect password for a registered user', async () => {
      const email = uniqueEmail();
      await register(email, VALID_PASSWORD).expect(201);

      const response = await login(email, 'wrong-password');

      expect(response.status).toBe(401);
    });

    it('rejects a missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: VALID_PASSWORD });

      expect(response.status).toBe(400);
    });

    it('rejects a missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: uniqueEmail() });

      expect(response.status).toBe(400);
    });
  });
});
