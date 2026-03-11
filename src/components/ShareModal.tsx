import { useMemo, useState } from 'react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import { getCurrentUserContext } from '../utils/authSession'
import { buildPublicShareUrl, createShareToken, getShareResolverUrl } from '../utils/shareLinks'
import { useToast } from './toastContext'
import './ShareModal.css'

const client = generateClient<Schema>()

type FileRecord = Schema['FileRecord']['type']

interface ShareModalProps {
  file: FileRecord
  onClose: () => void
}

const expirationOptions = [
  { label: '24 hours', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
]

function ShareModal({ file, onClose }: ShareModalProps) {
  const [selectedDays, setSelectedDays] = useState(7)
  const [creating, setCreating] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const { showToast } = useToast()
  const shareResolverUrl = getShareResolverUrl()

  const expiresAt = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() + selectedDays)
    return date
  }, [selectedDays])

  async function handleCreateLink() {
    if (!shareResolverUrl) {
      showToast(
        'Sharing is not configured for this build. Regenerate amplify_outputs.json after deploying Amplify or set VITE_SHARE_RESOLVER_URL.',
        'error'
      )
      return
    }

    setCreating(true)

    try {
      const { owner } = await getCurrentUserContext()
      const token = createShareToken()

      await client.models.ShareLink.create({
        id: token,
        s3Key: file.s3Key,
        fileName: file.fileName,
        contentType: file.contentType,
        fileSize: file.fileSize,
        version: file.version,
        logicalFileId: file.logicalFileId ?? undefined,
        expiresAt: expiresAt.toISOString(),
        owner,
      })

      const publicUrl = buildPublicShareUrl(token)
      setShareUrl(publicUrl)
      showToast('Secure share link created.', 'success')
    } catch (error) {
      console.error('Failed to create share link', error)
      showToast('Failed to create share link.', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToast('Link copied to clipboard.', 'success')
    } catch (error) {
      console.error('Failed to copy link', error)
      showToast('Failed to copy the link.', 'error')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content share-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Create secure link</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="share-modal-body">
          <p className="share-modal-copy">
            Generate a public link for {file.fileName}. The link points to this version and expires
            automatically.
          </p>

          {!shareResolverUrl ? (
            <p className="share-expiration-copy">
              Sharing is unavailable until this frontend has a valid resolver URL.
            </p>
          ) : null}

          <label className="rename-label" htmlFor="share-expiration">
            Expiration
          </label>
          <select
            id="share-expiration"
            className="share-select"
            value={selectedDays}
            onChange={(event) => setSelectedDays(Number(event.target.value))}
          >
            {expirationOptions.map((option) => (
              <option key={option.days} value={option.days}>
                {option.label}
              </option>
            ))}
          </select>

          <p className="share-expiration-copy">Expires on {expiresAt.toLocaleString()}</p>

          {shareUrl ? (
            <div className="share-result">
              <input className="share-url" value={shareUrl} readOnly />
              <div className="share-actions">
                <button
                  type="button"
                  className="share-copy-link-button"
                  onClick={handleCopyLink}
                >
                  Copy link
                </button>
                <a className="share-open-link" href={shareUrl} target="_blank" rel="noreferrer">
                  Open link
                </a>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn-rename-submit"
              onClick={handleCreateLink}
              disabled={!shareResolverUrl}
            >
              {creating ? 'Creating...' : 'Generate secure URL'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShareModal