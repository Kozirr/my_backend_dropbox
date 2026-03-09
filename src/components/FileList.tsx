import { useState, useEffect, useCallback } from 'react'
import { generateClient } from 'aws-amplify/data'
import { fetchAuthSession } from 'aws-amplify/auth'
import type { Schema } from '../../amplify/data/resource'
import ConfirmDialog from './ConfirmDialog'
import FileItem from './FileItem'
import FileVersions from './FileVersions'
import RenameModal from './RenameModal'
import { useToast } from './ToastProvider'
import './FileList.css'

const client = generateClient<Schema>()

type FileRecord = Schema['FileRecord']['type']

function FileList() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [versionsFile, setVersionsFile] = useState<FileRecord | null>(null)
  const [renameFile, setRenameFile] = useState<FileRecord | null>(null)
  const [deleteFile, setDeleteFile] = useState<FileRecord | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const { showToast } = useToast()

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
      showToast('Failed to load files.', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void loadFiles()

    const handleUpload = () => {
      void loadFiles()
    }

    window.addEventListener('fileUploaded', handleUpload)
    return () => window.removeEventListener('fileUploaded', handleUpload)
  }, [loadFiles])

  const handleDelete = useCallback((file: FileRecord) => {
    setDeleteFile(file)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteFile) {
      return
    }

    setActionBusy(true)

    try {
      const session = await fetchAuthSession()
      const owner = session.tokens?.idToken?.payload?.sub as string

      const { data: allVersions } = await client.models.FileRecord.list({
        filter: {
          fileName: { eq: deleteFile.fileName },
          owner: { eq: owner },
        },
      })

      await Promise.all(
        allVersions.map((version) => client.models.FileRecord.delete({ id: version.id }))
      )

      setDeleteFile(null)
      showToast(`Deleted ${deleteFile.fileName} and its saved versions.`, 'success')
      await loadFiles()
    } catch (err) {
      console.error('Delete failed:', err)
      showToast('Failed to delete file.', 'error')
    } finally {
      setActionBusy(false)
    }
  }, [deleteFile, loadFiles, showToast])

  const handleRenameSubmit = useCallback(
    async (file: FileRecord, newName: string) => {
      const trimmedName = newName.trim()
      if (!trimmedName || trimmedName === file.fileName) {
        return
      }

      setActionBusy(true)

      try {
        const session = await fetchAuthSession()
        const owner = session.tokens?.idToken?.payload?.sub as string

        const [{ data: existingTarget }, { data: allVersions }] = await Promise.all([
          client.models.FileRecord.list({
            filter: {
              fileName: { eq: trimmedName },
              owner: { eq: owner },
            },
          }),
          client.models.FileRecord.list({
            filter: {
              fileName: { eq: file.fileName },
              owner: { eq: owner },
            },
          }),
        ])

        if (existingTarget.length > 0) {
          showToast(
            `A file named ${trimmedName} already exists. Choose a different name.`,
            'error'
          )
          return
        }

        await Promise.all(
          allVersions.map((version) =>
            client.models.FileRecord.update({
              id: version.id,
              fileName: trimmedName,
            })
          )
        )

        if (versionsFile?.fileName === file.fileName) {
          setVersionsFile({ ...versionsFile, fileName: trimmedName })
        }

        setRenameFile(null)
        showToast(`Renamed ${file.fileName} to ${trimmedName}.`, 'success')
        await loadFiles()
      } catch (err) {
        console.error('Rename failed:', err)
        showToast('Failed to rename file.', 'error')
      } finally {
        setActionBusy(false)
      }
    },
    [loadFiles, showToast, versionsFile]
  )

  const closeDeleteDialog = useCallback(() => {
    if (actionBusy) {
      return
    }

    setDeleteFile(null)
  }, [actionBusy])

  const closeRenameDialog = useCallback(() => {
    if (actionBusy) {
      return
    }

    setRenameFile(null)
  }, [actionBusy])

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
          onClose={closeRenameDialog}
          busy={actionBusy}
        />
      )}

      {deleteFile && (
        <ConfirmDialog
          title="Delete file"
          message={`Delete ${deleteFile.fileName} and every saved version? This cannot be undone.`}
          confirmLabel="Delete file"
          tone="danger"
          busy={actionBusy}
          onConfirm={confirmDelete}
          onCancel={closeDeleteDialog}
        />
      )}
    </div>
  )
}

export default FileList