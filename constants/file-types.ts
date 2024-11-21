export const MIME_TYPES = {
  // Documents
  TEXT: 'text/plain',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  JSON: 'application/json',
  PDF: 'application/pdf',
  CSV: 'text/csv',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  
  // Images
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  JPG: 'image/jpeg'
} as const;

export type AcceptedMimeType = typeof MIME_TYPES[keyof typeof MIME_TYPES];

export const ACCEPTED_FILE_TYPES = {
  documents: [
    { extension: '.txt', mimeType: MIME_TYPES.TEXT },
    { extension: '.docx', mimeType: MIME_TYPES.DOCX },
    { extension: '.json', mimeType: MIME_TYPES.JSON },
    { extension: '.pdf', mimeType: MIME_TYPES.PDF },
    { extension: '.csv', mimeType: MIME_TYPES.CSV },
    { extension: '.xlsx', mimeType: MIME_TYPES.XLSX }
  ],
  images: [
    { extension: '.png', mimeType: MIME_TYPES.PNG },
    { extension: '.jpeg', mimeType: MIME_TYPES.JPEG },
    { extension: '.jpg', mimeType: MIME_TYPES.JPEG }
  ]
} as const

export const ACCEPTED_FILE_EXTENSIONS = [
  ...ACCEPTED_FILE_TYPES.documents.map(type => type.extension),
  ...ACCEPTED_FILE_TYPES.images.map(type => type.extension)
].join(',')

export const ACCEPTED_MIME_TYPES = [
  ...ACCEPTED_FILE_TYPES.documents.map(type => type.mimeType),
  ...ACCEPTED_FILE_TYPES.images.map(type => type.mimeType)
].join(',')

export const DOWNLOAD_FILE_TYPES = [
  { value: 'csv', label: 'CSV (.csv)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'txt', label: 'Text (.txt)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
] as const 