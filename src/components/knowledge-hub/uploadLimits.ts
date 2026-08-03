/**
 * Upload limits for Knowledge Hub resources.
 * Keep this as the single source of truth for any Knowledge Hub upload surface.
 */

export const KNOWLEDGE_HUB_MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB
export const KNOWLEDGE_HUB_DOCUMENT_GUIDANCE_BYTES = 50 * 1024 * 1024; // 50 MB

export const KNOWLEDGE_HUB_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/plain',
] as const;

export const KNOWLEDGE_HUB_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
] as const;

export const KNOWLEDGE_HUB_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const KNOWLEDGE_HUB_ALLOWED_MIME_TYPES: string[] = [
  ...KNOWLEDGE_HUB_DOCUMENT_MIME_TYPES,
  ...KNOWLEDGE_HUB_IMAGE_MIME_TYPES,
  ...KNOWLEDGE_HUB_VIDEO_MIME_TYPES,
];

/** Extension fallback for browsers that report an empty MIME type. */
export const KNOWLEDGE_HUB_ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt',
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg',
  'mp4', 'webm', 'mov',
];

export const KNOWLEDGE_HUB_ACCEPT_ATTRIBUTE = [
  ...KNOWLEDGE_HUB_ALLOWED_MIME_TYPES,
  ...KNOWLEDGE_HUB_ALLOWED_EXTENSIONS.map(ext => `.${ext}`),
].join(',');

export const KNOWLEDGE_HUB_ACCEPTED_FORMATS_LABEL =
  'PDF, Word, Excel, PowerPoint, CSV, TXT, JPG, PNG, WEBP, GIF, SVG, MP4, WEBM, MOV';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface FileValidationResult {
  valid: boolean;
  title?: string;
  message?: string;
}

export function validateKnowledgeHubFile(file: File): FileValidationResult {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const typeAllowed = file.type
    ? KNOWLEDGE_HUB_ALLOWED_MIME_TYPES.includes(file.type)
    : KNOWLEDGE_HUB_ALLOWED_EXTENSIONS.includes(extension);

  if (!typeAllowed) {
    return {
      valid: false,
      title: 'Unsupported file type',
      message: `"${file.name}" is not an accepted format. Accepted formats: ${KNOWLEDGE_HUB_ACCEPTED_FORMATS_LABEL}.`,
    };
  }

  if (file.size > KNOWLEDGE_HUB_MAX_FILE_BYTES) {
    return {
      valid: false,
      title: 'File too large',
      message: `"${file.name}" is ${formatFileSize(file.size)}. The maximum upload size is ${formatFileSize(KNOWLEDGE_HUB_MAX_FILE_BYTES)}.`,
    };
  }

  const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(extension);
  if (!isVideo && file.size > KNOWLEDGE_HUB_DOCUMENT_GUIDANCE_BYTES) {
    return {
      valid: false,
      title: 'File too large',
      message: `Documents and images are limited to ${formatFileSize(KNOWLEDGE_HUB_DOCUMENT_GUIDANCE_BYTES)}. "${file.name}" is ${formatFileSize(file.size)}. Only video files may go up to ${formatFileSize(KNOWLEDGE_HUB_MAX_FILE_BYTES)}.`,
    };
  }

  return { valid: true };
}

/** Turn an opaque storage error into something an admin can act on. */
export function describeUploadError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const lowered = raw.toLowerCase();

  if (
    lowered.includes('exceeded the maximum allowed size') ||
    lowered.includes('payload too large') ||
    lowered.includes('entity too large') ||
    lowered.includes('413')
  ) {
    return 'The file exceeded the server upload limit. Files up to 50 MB always work; larger videos require the project storage upload limit to be raised.';
  }

  if (lowered.includes('mime type') || lowered.includes('invalid_mime_type')) {
    return `That file type is not allowed. Accepted formats: ${KNOWLEDGE_HUB_ACCEPTED_FORMATS_LABEL}.`;
  }

  return raw;
}
