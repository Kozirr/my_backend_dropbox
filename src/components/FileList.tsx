import { useState, useEffect, useCallback } from 'react'
import { generateClient } from 'aws-amplify/data'
import { fetchAuthSession } from 'aws-amplify/auth'
import type { Schema } from '../../amplify/data/resource'
import FileItem from './FileItem'
import FileVersions from './FileVersions'
import RenameModal from './RenameModal'
import './FileList.css'

const client = generateClient<Schema>()

type FileRecord = Schema['FileRecord']['type']

function FileList() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [versionsFile, setVersionsFile] = useState<FileRecord | null>(null)
  const [renameFile, setRenameFile] = useState<FileRecord | null>(null)

  const loadFiles = useCallback(async () => {
    try {
      const session = await fetchAuthSession()
      const owner = session.tokens?.idToken?.payload?.sub as string

      const { data } = await client.models.FileRecord.list({
        filter: { owner: { eq: owner } },
      })

      const latestByName = new Map<string, FileRecord>()
      for (const file of data) {
        const existing = latestByName.get(file.fileName)
        if (!existing || file.version > existing.version) {
          latestByName.set(file.fileName, file)
        }
      }

      const sorted = Array.from(latestByName.values()).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setFiles(sorted)
    } catch (err) {
      console.error('Failed to load files:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFiles()

    const handleUpload = () => loadFiles()
    window.addEventListener('fileUploaded', handleUpload)
    return () => window.removeEventListener('fileUploaded', handleUpload)
  }, [loadFiles])

  const handleDelete = useCallback(
    async (file: FileRecord) => {
      if (!confirm(`Delete "${file.fileName}" and all its versions?`)) return

      try {
        const session = await fetchAuthSession()
        const owner = session.tokens?.idToken?.payload?.sub as string

        const { data: allVersions } = await client.models.FileRecord.list({
          filter: {
            fileName: { eq: file.fileName },
            owner: { eq: owner },
          },
        })

        await Promise.all(
          allVersions.map((v) => client.models.FileRecord.delete({ id: v.id }))
        )

        loadFiles()
      } catch (err) {
        console.error('Delete failed:', err)
        alert('Failed to delete file.')
      }
    },
    [loadFiles]
  )

  const handleRenameSubmit = useCallback(
    async (file: FileRecord, newName: string) => {
      try {
        await client.models.FileRecord.update({
          id: file.id,
          fileName: newName,
        })
        setRenameFile(null)
        loadFiles()
      } catch (err) {
        console.error('Rename failed:', err)
        alert('Failed to rename file.')
      }
    },
    [loadFiles]
  )

  if (loading) {
    return (
      <div className="file-list">
        <p className="file-list-loading">Loading files...</p>
      </div>
    )
  }

  return (
    <div className="file-list">
      <h2 className="file-list-title">Your Files</h2>
      {files.length === 0 ? (
        <p className="file-list-empty">
          No files yet. Upload your first file above!
        </p>
      ) : (
        <div className="file-list-grid">
          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onDelete={handleDelete}
              onRename={() => setRenameFile(file)}
              onViewVersions={() => setVersionsFile(file)}
            />
          ))}
        </div>
      )}

      {versionsFile && (
        <FileVersions
          fileName={versionsFile.fileName}
          onClose={() => setVersionsFile(null)}
        />
      )}

      {renameFile && (
        <RenameModal
          file={renameFile}
          onRename={handleRenameSubmit}
          onClose={() => setRenameFile(null)}
        />
      )}
    </div>
  )
}

export default FileList
