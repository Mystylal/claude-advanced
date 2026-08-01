export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

export function isAllowedMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith('audio/') ||
    mimeType.startsWith('video/') ||
    ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType)
  );
}
