export const ACCEPTED_FILE_TYPES = {
  documents: [
    { extension: '.txt', mimeType: 'text/plain' },
    { extension: '.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { extension: '.json', mimeType: 'application/json' },
    { extension: '.pdf', mimeType: 'application/pdf' },
    { extension: '.csv', mimeType: 'text/csv' },
    { extension: '.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  ],
  images: [
    { extension: '.png', mimeType: 'image/png' },
    { extension: '.jpeg', mimeType: 'image/jpeg' },
    { extension: '.jpg', mimeType: 'image/jpeg' }
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