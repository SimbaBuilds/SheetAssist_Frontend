export const DOCUMENT_SCOPES = {
    google: [
      'https://www.googleapis.com/auth/drive.file'
    ].join(' '),
    microsoft: [
      'offline_access',
      'Files.ReadWrite',
      'email',
      'User.Read',
      'openid'
    ].join(' ')
  } as const