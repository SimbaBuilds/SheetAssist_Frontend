export const DOCUMENT_SCOPES = {
    google: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly'
    ].join(' '),
    microsoft: [
      'offline_access',
      'Files.ReadWrite',
      'email',
      'User.Read',
      'openid'
    ].join(' ')
  } as const