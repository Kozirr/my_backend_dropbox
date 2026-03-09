import { useState, useRef, useCallback } from 'react'
import { uploadData } from 'aws-amplify/storage'
import { generateClient } from 'aws-amplify/data'
import { fetchAuthSession } from 'aws-amplify/auth'
import type { Schema } from '../../amplify/data/resource'
import { useToast } from './ToastProvider'
import './FileUpload.css'

const client = generateClient<Schema>()

function sortByVersionDesc<T extends { version: number }>(records: T[]) {
  return [...records].sort((left, right) => right.version - left.version)
}

function FileUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true)
    setProgress(0)

    try {
      const session = await fetchAuthSession()
      const identityId = session.identityId!
      const owner = session.tokens?.idToken?.payload?.sub as string

      const { data: existingFiles } = await client.models.FileRecord.list({
        filter: {
          fileName: { eq: file.name },
          owner: { eq: owner },
        },
      })

      const sortedExistingFiles = sortByVersionDesc(existingFiles)
      const latestRecord = sortedExistingFiles[0]
      const maxVersion = existingFiles.reduce(
        (max, f) => Math.max(max, f.version),
        0
      )
      const newVersion = maxVersion + 1
      const logicalFileId = latestRecord?.logicalFileId ?? crypto.randomUUID()

      if (existingFiles.length > 0 && !latestRecord?.logicalFileId) {
        await Promise.all(
          existingFiles.map((existingFile) =>
            client.models.FileRecord.update({
              id: existingFile.id,
              logicalFileId,
            })
          )
        )
      }

      const s3Path = `private/${identityId}/${logicalFileId}/v${newVersion}`

      await uploadData({
        path: s3Path,
        data: file,
        options: {
          contentType: file.type,
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              setProgress(Math.round((transferredBytes / totalBytes) * 100))
            }
          },
        },
      }).result

      await client.models.FileRecord.create({
        fileName: file.name,
        logicalFileId,
        s3Key: s3Path,
        fileSize: file.size,
        contentType: file.type || 'application/octet-stream',
        version: newVersion,
        owner,
      })

      setProgress(100)
      showToast(`Uploaded ${file.name} as version ${newVersion}.`, 'success')
      window.dispatchEvent(new Event('fileUploaded'))
    } catch (err) {
      console.error('Upload failed:', err)
      showToast('Upload failed. Please try again.', 'error')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [showToast])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      uploadFile(files[0])
    },
    [uploadFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  return (
    <div className="file-upload">
      <div
        className={`file-upload-zone ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-text">Uploading... {progress}%</span>
          </div>
        ) : (
          <>
            <span className="upload-icon">⬆</span>
            <p className="upload-text">
              Drag & drop a file here, or <span className="upload-link">browse</span>
            </p>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="file-input-hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export default FileUpload
