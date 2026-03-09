import { useCallback } from 'react'
import { getUrl } from 'aws-amplify/storage'
import type { Schema } from '../../amplify/data/resource'
import './FileItem.css'

type FileRecord = Schema['FileRecord']['type']

interface FileItemProps {
  file: FileRecord
  onDelete: (file: FileRecord) => void
  onRename: () => void
  onViewVersions: () => void
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

function FileItem({ file, onDelete, onRename, onViewVersions }: FileItemProps) {
  const handleDownload = useCallback(async () => {
    try {
      const { url } = await getUrl({
        path: file.s3Key,
        options: { expiresIn: 3600 },
      })
      window.open(url.toString(), '_blank')
    } catch (err) {
      console.error('Download failed:', err)
      alert('Failed to get download link.')
    }
  }, [file.s3Key])

  return (
    <div className="file-item">
      <div className="file-item-info">
        <span className="file-item-icon">📄</span>
        <div className="file-item-details">
          <span className="file-item-name">{file.fileName}</span>
          <span className="file-item-meta">
            {formatFileSize(file.fileSize)} · v{file.version} · {formatDate(file.createdAt)}
          </span>
        </div>
      </div>
      <div className="file-item-actions">
        <button className="btn-action btn-download" onClick={handleDownload} title="Download">
          ⬇
        </button>
        <button className="btn-action btn-versions" onClick={onViewVersions} title="View versions">
          🕐
        </button>
        <button className="btn-action btn-rename" onClick={onRename} title="Rename">
          ✏️
        </button>
        <button className="btn-action btn-delete" onClick={() => onDelete(file)} title="Delete">
          🗑
        </button>
      </div>
    </div>
  )
}

export default FileItem
