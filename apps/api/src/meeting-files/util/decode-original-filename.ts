// Busboy (used internally by multer) decodes multipart header values —
// including the file name — as latin1 by default. Browsers send UTF-8 bytes
// for non-ASCII file names without RFC 2231 encoding, so those bytes need to
// be re-interpreted as UTF-8 or they come out as mojibake.
export function decodeOriginalFilename(originalname: string): string {
  return Buffer.from(originalname, 'latin1').toString('utf8');
}
