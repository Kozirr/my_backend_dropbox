import { useCallback } from 'react'
import type { Schema } from '../../amplify/data/resource'
import { downloadFile } from '../utils/downloadFile'
import { useToast } from './toastContext'
import './FileItem.css'

type FileRecord = Schema['FileRecord']['type']

interface FileItemProps {
  file: FileRecord
  onDelete: (file: FileRecord) => void
  onRename: () => void
  onPreview: () => void
  onShare: () => void
  onViewVersions: () => void
}

function getFileKindLabel(file: FileRecord) {
  if (file.contentType.startsWith('image/')) {
    return 'Image'
  }

  if (file.contentType === 'application/pdf') {
    return 'PDF'
  }

  if (file.contentType.startsWith('text/')) {
    return 'Text'
  }

  return 'File'
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

function FileItem({ file, onDelete, onRename, onPreview, onShare, onViewVersions }: FileItemProps) {
  const { showToast } = useToast()

  const handleDownload = useCallback(async () => {
    try {
      await downloadFile({
        path: file.s3Key,
        fileName: file.fileName,
      })
    } catch (err) {
      console.error('Download failed:', err)
      showToast(`Failed to download ${file.fileName}.`, 'error')
    }
  }, [file.fileName, file.s3Key, showToast])

  return (
    <div className="file-item">
      <div className="file-item-info">
        <span className="file-item-icon">{getFileKindLabel(file)}</span>
        <div className="file-item-details">
          <span className="file-item-name">{file.fileName}</span>
          <span className="file-item-meta">
            {formatFileSize(file.fileSize)} · v{file.version} · {formatDate(file.createdAt)}
          </span>
        </div>
      </div>
      <div className="file-item-actions">
        <button className="btn-action" onClick={onPreview} title="Preview file">
          Preview
        </button>
        <button className="btn-action" onClick={handleDownload} title="Download file">
          Download
        </button>
        <button className="btn-action" onClick={onViewVersions} title="View saved versions">
          Versions
        </button>
        <button className="btn-action" onClick={onShare} title="Create a secure share link">
          Share
        </button>
        <button className="btn-action" onClick={onRename} title="Rename file">
          Rename
        </button>
        <button className="btn-action btn-delete" onClick={() => onDelete(file)} title="Delete file">
          Delete
        </button>
      </div>
    </div>
  )
}

export default FileItem
