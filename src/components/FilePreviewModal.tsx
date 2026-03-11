import { useEffect, useState } from 'react'
import { getUrl } from 'aws-amplify/storage'
import type { Schema } from '../../amplify/data/resource'
import './FilePreviewModal.css'

type FileRecord = Schema['FileRecord']['type']

interface FilePreviewModalProps {
  file: FileRecord
  onClose: () => void
}

function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [textPreview, setTextPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      try {
        const { url } = await getUrl({ path: file.s3Key })
        const resolvedUrl = url.toString()

        if (!cancelled) {
          setPreviewUrl(resolvedUrl)
        }

        if (file.contentType.startsWith('text/')) {
          const response = await fetch(resolvedUrl)
          const text = await response.text()
          if (!cancelled) {
            setTextPreview(text)
          }
        }
      } catch (previewError) {
        console.error('Failed to load preview', previewError)
        if (!cancelled) {
          setError('Preview is unavailable for this file right now.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadPreview()
    return () => {
      cancelled = true
    }
  }, [file.contentType, file.s3Key])

  let body = null

  if (loading) {
    body = <p className="preview-placeholder">Loading preview...</p>
  } else if (error) {
    body = <p className="preview-placeholder">{error}</p>
  } else if (file.contentType.startsWith('image/')) {
    body = <img className="preview-image" src={previewUrl} alt={file.fileName} />
  } else if (file.contentType === 'application/pdf') {
    body = <iframe className="preview-frame" src={previewUrl} title={file.fileName} />
  } else if (file.contentType.startsWith('text/')) {
    body = <pre className="preview-text">{textPreview}</pre>
  } else {
    body = (
      <div className="preview-placeholder">
        <p>This file type does not support inline preview yet.</p>
        <a href={previewUrl} target="_blank" rel="noreferrer">
          Open the file in a new tab
        </a>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content preview-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{file.fileName}</h3>
            <p className="preview-subtitle">Version {file.version}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="preview-body">{body}</div>
      </div>
    </div>
  )
}

export default FilePreviewModal