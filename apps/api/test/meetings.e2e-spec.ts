import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface AuthResponseBody {
  accessToken: string;
}

interface MeetingResponseBody {
  id: string;
  title: string;
  date: string;
  participants: string[];
}

const VALID_PASSWORD = 'correct-horse-battery-staple';

function uniqueEmail(): string {
  return `e2e-${randomUUID()}@example.com`;
}

describe('Meetings (e2e)', () => {
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

  async function registerAndGetToken(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: uniqueEmail(), password: VALID_PASSWORD });

    const body = response.body as AuthResponseBody;
    return body.accessToken;
  }

  const createMeeting = (
    token: string,
    body: Record<string, unknown> = {
      title: 'Sprint planning',
      date: '2026-08-01T10:00:00.000Z',
      participants: ['alice@example.com', 'bob@example.com'],
    },
  ) =>
    request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const listMeetings = (token: string) =>
    request(app.getHttpServer())
      .get('/meetings')
      .set('Authorization', `Bearer ${token}`);

  const getMeeting = (token: string, id: string) =>
    request(app.getHttpServer())
      .get(`/meetings/${id}`)
      .set('Authorization', `Bearer ${token}`);

  describe('POST /meetings', () => {
    it('rejects unauthenticated requests', async () => {
      const response = await request(app.getHttpServer())
        .post('/meetings')
        .send({
          title: 'Sprint planning',
          date: '2026-08-01T10:00:00.000Z',
          participants: ['alice@example.com'],
        });

      expect(response.status).toBe(401);
    });

    it('creates a new meeting for the authenticated user', async () => {
      const token = await registerAndGetToken();

      const response = await createMeeting(token);
      const body = response.body as MeetingResponseBody;

      expect(response.status).toBe(201);
      expect(typeof body.id).toBe('string');
      expect(body.title).toBe('Sprint planning');
      expect(new Date(body.date).toISOString()).toBe(
        '2026-08-01T10:00:00.000Z',
      );
      expect(body.participants).toEqual([
        'alice@example.com',
        'bob@example.com',
      ]);
    });

    it('rejects a missing title', async () => {
      const token = await registerAndGetToken();

      const response = await createMeeting(token, {
        date: '2026-08-01T10:00:00.000Z',
        participants: ['alice@example.com'],
      });

      expect(response.status).toBe(400);
    });

    it('rejects a missing date', async () => {
      const token = await registerAndGetToken();

      const response = await createMeeting(token, {
        title: 'Sprint planning',
        participants: ['alice@example.com'],
      });

      expect(response.status).toBe(400);
    });

    it('rejects a missing participants list', async () => {
      const token = await registerAndGetToken();

      const response = await createMeeting(token, {
        title: 'Sprint planning',
        date: '2026-08-01T10:00:00.000Z',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /meetings', () => {
    it('rejects unauthenticated requests', async () => {
      const response = await request(app.getHttpServer()).get('/meetings');

      expect(response.status).toBe(401);
    });

    it('returns only the meetings created by the current user', async () => {
      const ownerToken = await registerAndGetToken();
      const otherToken = await registerAndGetToken();

      const created = await createMeeting(ownerToken, {
        title: 'Owner meeting',
        date: '2026-08-02T10:00:00.000Z',
        participants: ['carol@example.com'],
      });
      const createdBody = created.body as MeetingResponseBody;

      await createMeeting(otherToken, {
        title: 'Other meeting',
        date: '2026-08-03T10:00:00.000Z',
        participants: ['dave@example.com'],
      });

      const response = await listMeetings(ownerToken);
      const body = response.body as MeetingResponseBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.map((meeting) => meeting.id)).toContain(createdBody.id);
      expect(body.every((meeting) => meeting.title !== 'Other meeting')).toBe(
        true,
      );
    });

    it('returns an empty list for a user with no meetings', async () => {
      const token = await registerAndGetToken();

      const response = await listMeetings(token);
      const body = response.body as MeetingResponseBody[];

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('GET /meetings/:id', () => {
    it('rejects unauthenticated requests', async () => {
      const response = await request(app.getHttpServer()).get(
        `/meetings/${randomUUID()}`,
      );

      expect(response.status).toBe(401);
    });

    it('returns the meeting by id for its owner', async () => {
      const token = await registerAndGetToken();
      const created = await createMeeting(token);
      const createdBody = created.body as MeetingResponseBody;

      const response = await getMeeting(token, createdBody.id);
      const body = response.body as MeetingResponseBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(createdBody.id);
      expect(body.title).toBe('Sprint planning');
    });

    it('returns 404 when the meeting does not exist', async () => {
      const token = await registerAndGetToken();

      const response = await getMeeting(token, randomUUID());

      expect(response.status).toBe(404);
    });

    it('returns 404 for a meeting that belongs to another user', async () => {
      const ownerToken = await registerAndGetToken();
      const otherToken = await registerAndGetToken();

      const created = await createMeeting(ownerToken);
      const createdBody = created.body as MeetingResponseBody;

      const response = await getMeeting(otherToken, createdBody.id);

      expect(response.status).toBe(404);
    });
  });
});
