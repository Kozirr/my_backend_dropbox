import { useState, useRef, useCallback } from 'react'
import { uploadData } from 'aws-amplify/storage'
import { generateClient } from 'aws-amplify/data'
import { fetchAuthSession } from 'aws-amplify/auth'
import type { Schema } from '../../amplify/data/resource'
import './FileUpload.css'

const client = generateClient<Schema>()

function FileUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

      const maxVersion = existingFiles.reduce(
        (max, f) => Math.max(max, f.version),
        0
      )
      const newVersion = maxVersion + 1

      const s3Path = `private/${identityId}/${file.name}_v${newVersion}`

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
        s3Key: s3Path,
        fileSize: file.size,
        contentType: file.type || 'application/octet-stream',
        version: newVersion,
        owner,
      })

      setProgress(100)
      window.dispatchEvent(new Event('fileUploaded'))
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [])

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
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}

export default FileUpload
