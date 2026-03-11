import outputs from '../../amplify_outputs.json'

interface CustomOutputs {
  custom?: {
    shareResolverUrl?: string
  }
}

export function createShareToken() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(18))
  const suffix = Array.from(randomBytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `${crypto.randomUUID().replace(/-/g, '')}${suffix}`
}

export function buildPublicShareUrl(token: string) {
  return new URL(`/shared/${token}`, window.location.origin).toString()
}

export function getShareResolverUrl() {
  const configuredUrl =
    import.meta.env.VITE_SHARE_RESOLVER_URL?.trim() ||
    (outputs as CustomOutputs).custom?.shareResolverUrl?.trim() ||
    ''

  if (!configuredUrl) {
    return ''
  }

  try {
    return new URL(configuredUrl).toString()
  } catch {
    return ''
  }
}

export function buildShareResolverRequestUrl(token: string, mode?: 'json' | 'redirect') {
  const resolverUrl = getShareResolverUrl()

  if (!resolverUrl) {
    return ''
  }

  const requestUrl = new URL(resolverUrl)
  requestUrl.searchParams.set('token', token)

  if (mode === 'redirect') {
    requestUrl.searchParams.set('mode', 'redirect')
  }

  return requestUrl.toString()
}