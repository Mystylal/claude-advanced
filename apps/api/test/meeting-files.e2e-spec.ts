import { randomUUID } from 'crypto';
import { readdirSync } from 'fs';
import { join } from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { MAX_FILE_SIZE_BYTES } from './../src/meeting-files/config/file-upload.constants';
import { AppModule } from './../src/app.module';

const STORAGE_DIR = join(process.cwd(), 'storage', 'meeting-files');

function countStoredFiles(): number {
  return readdirSync(STORAGE_DIR).length;
}

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

  const downloadFile = (token: string, meetingId: string, fileId: string) =>
    request(app.getHttpServer())
      .get(`/meetings/${meetingId}/files/${fileId}`)
      .set('Authorization', `Bearer ${token}`);

  const deleteFile = (token: string, meetingId: string, fileId: string) =>
    request(app.getHttpServer())
      .delete(`/meetings/${meetingId}/files/${fileId}`)
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

    it('does not leave an orphaned file on disk when the upload is rejected', async () => {
      const owner = await registerAndGetToken();
      const outsider = await registerAndGetToken();
      const meeting = await createMeeting(owner.token, [
        'someone-else@example.com',
      ]);
      const meetingBody = meeting.body as MeetingResponseBody;

      const filesBefore = countStoredFiles();

      const forbidden = await uploadFile(outsider.token, meetingBody.id);
      expect(forbidden.status).toBe(403);

      const notFound = await uploadFile(owner.token, randomUUID());
      expect(notFound.status).toBe(404);

      expect(countStoredFiles()).toBe(filesBefore);
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

  describe('GET /meetings/:id/files/:fileId', () => {
    it('rejects unauthenticated requests', async () => {
      const response = await request(app.getHttpServer()).get(
        `/meetings/${randomUUID()}/files/${randomUUID()}`,
      );

      expect(response.status).toBe(401);
    });

    it('lets the owner download the file content', async () => {
      const { token } = await registerAndGetToken();
      const meeting = await createMeeting(token, ['participant@example.com']);
      const meetingBody = meeting.body as MeetingResponseBody;

      const uploaded = await uploadFile(token, meetingBody.id);
      const uploadedBody = uploaded.body as MeetingFileResponseBody;

      const response = await downloadFile(
        token,
        meetingBody.id,
        uploadedBody.id,
      );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/plain');
      expect(response.text).toBe('hello world');
    });

    it('lets a participant (non-owner) download the file content', async () => {
      const owner = await registerAndGetToken();
      const participant = await registerAndGetToken();
      const meeting = await createMeeting(owner.token, [participant.email]);
      const meetingBody = meeting.body as MeetingResponseBody;

      const uploaded = await uploadFile(owner.token, meetingBody.id);
      const uploadedBody = uploaded.body as MeetingFileResponseBody;

      const response = await downloadFile(
        participant.token,
        meetingBody.id,
        uploadedBody.id,
      );

      expect(response.status).toBe(200);
      expect(response.text).toBe('hello world');
    });

    it('rejects a user who is not a participant of the meeting with 403', async () => {
      const owner = await registerAndGetToken();
      const outsider = await registerAndGetToken();
      const meeting = await createMeeting(owner.token, [
        'someone-else@example.com',
      ]);
      const meetingBody = meeting.body as MeetingResponseBody;

      const uploaded = await uploadFile(owner.token, meetingBody.id);
      const uploadedBody = uploaded.body as MeetingFileResponseBody;

      const response = await downloadFile(
        outsider.token,
        meetingBody.id,
        uploadedBody.id,
      );

      expect(response.status).toBe(403);
    });

    it('returns 404 for a file that does not exist', async () => {
      const { token } = await registerAndGetToken();
      const meeting = await createMeeting(token, ['participant@example.com']);
      const meetingBody = meeting.body as MeetingResponseBody;

      const response = await downloadFile(token, meetingBody.id, randomUUID());

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /meetings/:id/files/:fileId', () => {
    it('rejects unauthenticated requests', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/meetings/${randomUUID()}/files/${randomUUID()}`,
      );

      expect(response.status).toBe(401);
    });

    it('lets the owner delete their own file', async () => {
      const { token } = await registerAndGetToken();
      const meeting = await createMeeting(token, ['participant@example.com']);
      const meetingBody = meeting.body as MeetingResponseBody;

      const uploaded = await uploadFile(token, meetingBody.id);
      const uploadedBody = uploaded.body as MeetingFileResponseBody;

      const response = await deleteFile(token, meetingBody.id, uploadedBody.id);

      expect(response.status).toBe(204);

      const listed = await listFiles(token, meetingBody.id);
      expect(listed.body as MeetingFileResponseBody[]).toEqual([]);
    });

    it('lets the owner delete a file uploaded by a participant', async () => {
      const owner = await registerAndGetToken();
      const participant = await registerAndGetToken();
      const meeting = await createMeeting(owner.token, [participant.email]);
      const meetingBody = meeting.body as MeetingResponseBody;

      const uploaded = await uploadFile(participant.token, meetingBody.id);
      const uploadedBody = uploaded.body as MeetingFileResponseBody;

      const response = await deleteFile(
        owner.token,
        meetingBody.id,
        uploadedBody.id,
      );

      expect(response.status).toBe(204);
    });

    it('rejects a participant (non-owner) trying to delete a file with 403', async () => {
      const owner = await registerAndGetToken();
      const participant = await registerAndGetToken();
      const meeting = await createMeeting(owner.token, [participant.email]);
      const meetingBody = meeting.body as MeetingResponseBody;

      const uploaded = await uploadFile(owner.token, meetingBody.id);
      const uploadedBody = uploaded.body as MeetingFileResponseBody;

      const response = await deleteFile(
        participant.token,
        meetingBody.id,
        uploadedBody.id,
      );

      expect(response.status).toBe(403);

      const listed = await listFiles(owner.token, meetingBody.id);
      expect(listed.body as MeetingFileResponseBody[]).toHaveLength(1);
    });

    it('removes the file from disk storage', async () => {
      const { token } = await registerAndGetToken();
      const meeting = await createMeeting(token, ['participant@example.com']);
      const meetingBody = meeting.body as MeetingResponseBody;

      const uploaded = await uploadFile(token, meetingBody.id);
      const uploadedBody = uploaded.body as MeetingFileResponseBody;

      const filesBefore = countStoredFiles();
      await deleteFile(token, meetingBody.id, uploadedBody.id);

      expect(countStoredFiles()).toBe(filesBefore - 1);
    });

    it('returns 404 for a file that does not exist', async () => {
      const { token } = await registerAndGetToken();
      const meeting = await createMeeting(token, ['participant@example.com']);
      const meetingBody = meeting.body as MeetingResponseBody;

      const response = await deleteFile(token, meetingBody.id, randomUUID());

      expect(response.status).toBe(404);
    });
  });

  describe('file size and mime-type limits', () => {
    it('rejects a file over the configured size limit', async () => {
      const { token } = await registerAndGetToken();
      const meeting = await createMeeting(token, ['participant@example.com']);
      const meetingBody = meeting.body as MeetingResponseBody;

      const oversizedFile = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1);

      const response = await request(app.getHttpServer())
        .post(`/meetings/${meetingBody.id}/files`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', oversizedFile, 'recording.wav');

      expect(response.status).toBe(413);
    });

    it('rejects a file with a disallowed mime type', async () => {
      const { token } = await registerAndGetToken();
      const meeting = await createMeeting(token, ['participant@example.com']);
      const meetingBody = meeting.body as MeetingResponseBody;

      const response = await request(app.getHttpServer())
        .post(`/meetings/${meetingBody.id}/files`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('not an image'), {
          filename: 'photo.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(415);
    });

    it('accepts audio and video mime types', async () => {
      const { token } = await registerAndGetToken();
      const meeting = await createMeeting(token, ['participant@example.com']);
      const meetingBody = meeting.body as MeetingResponseBody;

      const audioResponse = await request(app.getHttpServer())
        .post(`/meetings/${meetingBody.id}/files`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake audio'), {
          filename: 'recording.mp3',
          contentType: 'audio/mpeg',
        });
      expect(audioResponse.status).toBe(201);

      const videoResponse = await request(app.getHttpServer())
        .post(`/meetings/${meetingBody.id}/files`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake video'), {
          filename: 'recording.mp4',
          contentType: 'video/mp4',
        });
      expect(videoResponse.status).toBe(201);
    });
  });
});
