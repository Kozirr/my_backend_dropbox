import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getShareResolverUrl } from '../utils/shareLinks'
import './SharedFilePage.css'

interface SharedFilePayload {
  contentType: string
  downloadUrl: string
  expiresAt: string
  fileName: string
  fileSize: number
  version: number
}

function formatFileSize(bytes: number) {
  if (bytes === 0) {
    return '0 B'
  }

  const sizes = ['B', 'KB', 'MB', 'GB']
  const index = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, index)).toFixed(index > 0 ? 1 : 0)} ${sizes[index]}`
}

function SharedFilePage() {
  const { token } = useParams()
  const [payload, setPayload] = useState<SharedFilePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadShare() {
      if (!token) {
        setError('Missing share token.')
        setLoading(false)
        return
      }

      const resolverUrl = getShareResolverUrl()
      if (!resolverUrl) {
        setError(
          'Share links are not configured for this build. Regenerate amplify_outputs.json after deploying Amplify or set VITE_SHARE_RESOLVER_URL.'
        )
        setLoading(false)
        return
      }

      try {
        const requestUrl = new URL(resolverUrl)
        requestUrl.searchParams.set('token', token)

        const response = await fetch(requestUrl, {
          headers: {
            accept: 'application/json',
          },
        })

        const data = (await response.json().catch(() => ({}))) as Partial<SharedFilePayload> & {
          message?: string
        }

        if (!response.ok) {
          throw new Error(data.message ?? 'Unable to open the share link.')
        }

        if (!cancelled) {
          setPayload(data as SharedFilePayload)
        }
      } catch (loadError) {
        console.error('Failed to open share link', loadError)
        if (!cancelled) {
          if (loadError instanceof TypeError) {
            setError(
              'Unable to reach the share service. If the backend was redeployed, regenerate amplify_outputs.json and rebuild the frontend.'
            )
            return
          }

          setError(loadError instanceof Error ? loadError.message : 'Unable to open the share link.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadShare()
    return () => {
      cancelled = true
    }
  }, [token])

  let preview = null

  if (payload?.contentType.startsWith('image/')) {
    preview = <img className="shared-preview-image" src={payload.downloadUrl} alt={payload.fileName} />
  } else if (payload?.contentType === 'application/pdf') {
    preview = <iframe className="shared-preview-frame" src={payload.downloadUrl} title={payload.fileName} />
  }

  return (
    <main className="shared-page">
      <section className="shared-card">
        <p className="shared-kicker">Shared file</p>
        <h1>{payload?.fileName ?? 'Open secure file link'}</h1>

        {loading ? <p>Loading link...</p> : null}
        {!loading && error ? <p className="shared-error">{error}</p> : null}

        {!loading && payload ? (
          <>
            <p className="shared-meta">
              {formatFileSize(payload.fileSize)} · Version {payload.version} · Expires{' '}
              {new Date(payload.expiresAt).toLocaleString()}
            </p>
            {preview}
            <div className="shared-actions">
              <a className="shared-download" href={payload.downloadUrl} target="_blank" rel="noreferrer">
                Open file
              </a>
              <Link className="shared-home-link" to="/files">
                Open workspace
              </Link>
            </div>
          </>
        ) : null}
      </section>
    </main>
  )
}

export default SharedFilePage