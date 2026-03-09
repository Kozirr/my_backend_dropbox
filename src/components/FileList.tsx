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

function getGroupKey(file: FileRecord) {
  return file.logicalFileId ?? `legacy:${file.owner}:${file.fileName}`
}

async function listVersionsForFile(file: FileRecord, owner: string) {
  if (file.logicalFileId) {
    return client.models.FileRecord.list({
      filter: {
        logicalFileId: { eq: file.logicalFileId },
        owner: { eq: owner },
      },
    })
  }

  return client.models.FileRecord.list({
    filter: {
      fileName: { eq: file.fileName },
      owner: { eq: owner },
    },
  })
}

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

      const latestByGroup = new Map<string, FileRecord>()
      for (const file of data) {
        const groupKey = getGroupKey(file)
        const existing = latestByGroup.get(groupKey)
        if (!existing || file.version > existing.version) {
          latestByGroup.set(groupKey, file)
        }
      }

      const sorted = Array.from(latestByGroup.values()).sort(
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

      const { data: allVersions } = await listVersionsForFile(deleteFile, owner)

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
      let owner = ''
      let originalVersions: FileRecord[] = []

      try {
        const session = await fetchAuthSession()
        owner = session.tokens?.idToken?.payload?.sub as string
        const currentGroupKey = getGroupKey(file)

        const [{ data: existingTarget }, { data: allVersions }] = await Promise.all([
          client.models.FileRecord.list({
            filter: {
              fileName: { eq: trimmedName },
              owner: { eq: owner },
            },
          }),
          listVersionsForFile(file, owner),
        ])

        originalVersions = allVersions

        const conflictingTarget = existingTarget.find(
          (targetRecord) => getGroupKey(targetRecord) !== currentGroupKey
        )

        if (conflictingTarget) {
          showToast(
            `A file named ${trimmedName} already exists. Choose a different name.`,
            'error'
          )
          return
        }

        const logicalFileId =
          allVersions.find((version) => version.logicalFileId)?.logicalFileId ?? crypto.randomUUID()

        for (const version of allVersions) {
          await client.models.FileRecord.update({
            id: version.id,
            fileName: trimmedName,
            logicalFileId,
          })
        }

        if (versionsFile && getGroupKey(versionsFile) === currentGroupKey) {
          setVersionsFile({ ...versionsFile, fileName: trimmedName, logicalFileId })
        }

        setRenameFile(null)
        showToast(`Renamed ${file.fileName} to ${trimmedName}.`, 'success')
        await loadFiles()
      } catch (err) {
        console.error('Rename failed:', err)

        if (owner && originalVersions.length > 0) {
          const { data: currentVersions } = await listVersionsForFile(file, owner)

          await Promise.all(
            currentVersions.map((version) => {
              const originalVersion = originalVersions.find((item) => item.id === version.id)
              if (!originalVersion) {
                return Promise.resolve()
              }

              return client.models.FileRecord.update({
                id: version.id,
                fileName: originalVersion.fileName,
                logicalFileId: originalVersion.logicalFileId ?? undefined,
              })
            })
          )
        }

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
          file={versionsFile}
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