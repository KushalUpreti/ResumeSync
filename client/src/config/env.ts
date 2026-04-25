const requiredCognitoKeys = [
  'VITE_COGNITO_REGION',
  'VITE_COGNITO_USER_POOL_ID',
  'VITE_COGNITO_CLIENT_ID',
  'VITE_COGNITO_DOMAIN',
] as const

function readEnv(name: string): string {
  return (import.meta.env[name] as string | undefined)?.trim() ?? ''
}

const missingCognitoKeys = requiredCognitoKeys.filter((key) => !readEnv(key))

export const env = {
  apiBaseUrl: readEnv('VITE_API_BASE_URL'),
  cognitoRegion: readEnv('VITE_COGNITO_REGION'),
  cognitoUserPoolId: readEnv('VITE_COGNITO_USER_POOL_ID'),
  cognitoClientId: readEnv('VITE_COGNITO_CLIENT_ID'),
  cognitoDomain: readEnv('VITE_COGNITO_DOMAIN'),
  cognitoRedirectUri: readEnv('VITE_COGNITO_REDIRECT_URI') || 'http://localhost:5173/auth/callback',
  cognitoLogoutUri: readEnv('VITE_COGNITO_LOGOUT_URI') || 'http://localhost:5173',
  missingCognitoKeys,
}

export function hasCognitoConfig() {
  return missingCognitoKeys.length === 0
}

export function hasApiBaseUrl() {
  return Boolean(env.apiBaseUrl)
}
