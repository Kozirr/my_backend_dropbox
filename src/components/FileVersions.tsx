import { useState, useEffect, useCallback } from 'react'
import { generateClient } from 'aws-amplify/data'
import { getUrl } from 'aws-amplify/storage'
import { fetchAuthSession } from 'aws-amplify/auth'
import type { Schema } from '../../amplify/data/resource'
import './FileVersions.css'

const client = generateClient<Schema>()

type FileRecord = Schema['FileRecord']['type']

interface FileVersionsProps {
  fileName: string
  onClose: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function FileVersions({ fileName, onClose }: FileVersionsProps) {
  const [versions, setVersions] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadVersions() {
      try {
        const session = await fetchAuthSession()
        const owner = session.tokens?.idToken?.payload?.sub as string

        const { data } = await client.models.FileRecord.list({
          filter: {
            fileName: { eq: fileName },
            owner: { eq: owner },
          },
        })

        const sorted = data.sort((a, b) => b.version - a.version)
        setVersions(sorted)
      } catch (err) {
        console.error('Failed to load versions:', err)
      } finally {
        setLoading(false)
      }
    }
    loadVersions()
  }, [fileName])

  const handleDownload = useCallback(async (s3Key: string) => {
    try {
      const { url } = await getUrl({
        path: s3Key,
        options: { expiresIn: 3600 },
      })
      window.open(url.toString(), '_blank')
    } catch (err) {
      console.error('Download failed:', err)
      alert('Failed to get download link.')
    }
  }, [])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Versions of "{fileName}"</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <p className="versions-loading">Loading versions...</p>
          ) : versions.length === 0 ? (
            <p className="versions-empty">No versions found.</p>
          ) : (
            <ul className="versions-list">
              {versions.map((v) => (
                <li key={v.id} className="version-item">
                  <div className="version-info">
                    <span className="version-label">v{v.version}</span>
                    <span className="version-meta">
                      {formatFileSize(v.fileSize)} · {formatDate(v.createdAt)}
                    </span>
                  </div>
                  <button
                    className="btn-action btn-download"
                    onClick={() => handleDownload(v.s3Key)}
                    title="Download this version"
                  >
                    ⬇
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default FileVersions
