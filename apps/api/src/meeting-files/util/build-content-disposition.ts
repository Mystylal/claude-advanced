export function buildAttachmentDisposition(filename: string): string {
  const asciiFallback =
    filename.replace(/[^\x20-\x7e]/g, '_').replace(/[\\"]/g, '_') || 'file';

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
