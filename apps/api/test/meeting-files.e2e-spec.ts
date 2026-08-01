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
}

interface MeetingFileResponseBody {
  id: string;
  meetingId: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  status: string;
}

const VALID_PASSWORD = 'correct-horse-battery-staple';

function uniqueEmail(): string {
  return `e2e-${randomUUID()}@example.com`;
}

describe('Meeting files (e2e)', () => {
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

  async function registerAndGetToken(): Promise<{
    token: string;
    email: string;
  }> {
    const email = uniqueEmail();
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: VALID_PASSWORD });

    const body = response.body as AuthResponseBody;
    return { token: body.accessToken, email };
  }

  const createMeeting = (token: string, participants: string[]) =>
    request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Sprint planning',
        date: '2026-08-01T10:00:00.000Z',
        participants,
      });

  const uploadFile = (token: string, meetingId: string) =>
    request(app.getHttpServer())
      .post(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('hello world'), 'notes.txt');

  const listFiles = (token: string, meetingId: string) =>
    request(app.getHttpServer())
      .get(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${token}`);

  describe('POST /meetings/:id/files', () => {
    it('rejects unauthenticated requests', async () => {
      const response = await request(app.getHttpServer())
        .post(`/meetings/${randomUUID()}/files`)
        .attach('file', Buffer.from('hello world'), 'notes.txt');

      expect(response.status).toBe(401);
    });

    it('allows the owner to upload a file', async () => {
      const { token } = await registerAndGetToken();
      const meeting = await createMeeting(token, ['participant@example.com']);
      const meetingBody = meeting.body as MeetingResponseBody;

      const response = await uploadFile(token, meetingBody.id);
      const body = response.body as MeetingFileResponseBody;

      expect(response.status).toBe(201);
      expect(typeof body.id).toBe('string');
      expect(body.meetingId).toBe(meetingBody.id);
      expect(body.name).toBe('notes.txt');
      expect(body.mimeType).toBe('text/plain');
      expect(body.size).toBe('hello world'.length);
      expect(body.status).toBe('pending');
    });

    it('allows a participant (non-owner) to upload a file', async () => {
      const owner = await registerAndGetToken();
      const participant = await registerAndGetToken();
      const meeting = await createMeeting(owner.token, [participant.email]);
      const meetingBody = meeting.body as MeetingResponseBody;

      const response = await uploadFile(participant.token, meetingBody.id);

      expect(response.status).toBe(201);
    });

    it('rejects a user who is not a participant of the meeting with 403', async () => {
      const owner = await registerAndGetToken();
      const outsider = await registerAndGetToken();
      const meeting = await createMeeting(owner.token, [
        'someone-else@example.com',
      ]);
      const meetingBody = meeting.body as MeetingResponseBody;

      const response = await uploadFile(outsider.token, meetingBody.id);

      expect(response.status).toBe(403);
    });

    it('returns 404 for a meeting that does not exist', async () => {
      const { token } = await registerAndGetToken();

      const response = await uploadFile(token, randomUUID());

      expect(response.status).toBe(404);
    });
  });

  describe('GET /meetings/:id/files', () => {
    it('rejects unauthenticated requests', async () => {
      const response = await request(app.getHttpServer()).get(
        `/meetings/${randomUUID()}/files`,
      );

      expect(response.status).toBe(401);
    });

    it('returns the uploaded files for the meeting owner', async () => {
      const { token } = await registerAndGetToken();
      const meeting = await createMeeting(token, ['participant@example.com']);
      const meetingBody = meeting.body as MeetingResponseBody;

      await uploadFile(token, meetingBody.id);

      const response = await listFiles(token, meetingBody.id);
      const body = response.body as MeetingFileResponseBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe('notes.txt');
    });

    it('returns the uploaded files for a participant (non-owner)', async () => {
      const owner = await registerAndGetToken();
      const participant = await registerAndGetToken();
      const meeting = await createMeeting(owner.token, [participant.email]);
      const meetingBody = meeting.body as MeetingResponseBody;

      await uploadFile(owner.token, meetingBody.id);

      const response = await listFiles(participant.token, meetingBody.id);
      const body = response.body as MeetingFileResponseBody[];

      expect(response.status).toBe(200);
      expect(body).toHaveLength(1);
    });

    it('rejects a user who is not a participant of the meeting with 403', async () => {
      const owner = await registerAndGetToken();
      const outsider = await registerAndGetToken();
      const meeting = await createMeeting(owner.token, [
        'someone-else@example.com',
      ]);
      const meetingBody = meeting.body as MeetingResponseBody;

      const response = await listFiles(outsider.token, meetingBody.id);

      expect(response.status).toBe(403);
    });

    it('returns 404 for a meeting that does not exist', async () => {
      const { token } = await registerAndGetToken();

      const response = await listFiles(token, randomUUID());

      expect(response.status).toBe(404);
    });
  });
});
