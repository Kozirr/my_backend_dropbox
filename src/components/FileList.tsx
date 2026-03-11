import { useState, useEffect, useCallback } from 'react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import ConfirmDialog from './ConfirmDialog'
import FileItem from './FileItem'
import FilePreviewModal from './FilePreviewModal'
import FileVersions from './FileVersions'
import RenameModal from './RenameModal'
import ShareModal from './ShareModal'
import { getCurrentUserContext } from '../utils/authSession'
import { useToast } from './toastContext'
import './FileList.css'

const client = generateClient<Schema>()

type FileRecord = Schema['FileRecord']['type']

interface FileListProps {
  activeFolderId?: string | null
  refreshToken?: number
  showTitle?: boolean
}

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

async function listOwnerFiles(owner: string) {
  return client.models.FileRecord.list({
    filter: { owner: { eq: owner } },
  })
}

function FileList({ activeFolderId = null, refreshToken = 0, showTitle = true }: FileListProps) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [versionsFile, setVersionsFile] = useState<FileRecord | null>(null)
  const [renameFile, setRenameFile] = useState<FileRecord | null>(null)
  const [deleteFile, setDeleteFile] = useState<FileRecord | null>(null)
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null)
  const [shareFile, setShareFile] = useState<FileRecord | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const { showToast } = useToast()

  const loadFiles = useCallback(async () => {
    try {
      const { owner } = await getCurrentUserContext()
      const { data } = await listOwnerFiles(owner)

      const latestByGroup = new Map<string, FileRecord>()
      for (const file of data) {
        const groupKey = getGroupKey(file)
        const existing = latestByGroup.get(groupKey)
        if (!existing || file.version > existing.version) {
          latestByGroup.set(groupKey, file)
        }
      }

      const filtered = Array.from(latestByGroup.values()).filter(
        (file) => (file.folderId ?? null) === activeFolderId
      )

      const sorted = filtered.sort(
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
  }, [activeFolderId, showToast])

  useEffect(() => {
    void loadFiles()

    const handleUpload = () => {
      void loadFiles()
    }

    window.addEventListener('fileUploaded', handleUpload)
    return () => window.removeEventListener('fileUploaded', handleUpload)
  }, [loadFiles, refreshToken])

  const handleDelete = useCallback((file: FileRecord) => {
    setDeleteFile(file)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteFile) {
      return
    }

    setActionBusy(true)

    try {
      const { owner } = await getCurrentUserContext()

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
        owner = (await getCurrentUserContext()).owner
        const currentGroupKey = getGroupKey(file)

        const [{ data: ownerFiles }, { data: allVersions }] = await Promise.all([
          listOwnerFiles(owner),
          listVersionsForFile(file, owner),
        ])

        originalVersions = allVersions

        const conflictingTarget = ownerFiles.find(
          (targetRecord) =>
            targetRecord.fileName === trimmedName &&
            (targetRecord.folderId ?? null) === (file.folderId ?? null) &&
            getGroupKey(targetRecord) !== currentGroupKey
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
          await Promise.all(
            originalVersions.map((version) =>
              client.models.FileRecord.update({
                id: version.id,
                fileName: version.fileName,
                logicalFileId: version.logicalFileId ?? undefined,
              })
            )
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
      {showTitle ? <h2 className="file-list-title">Your Files</h2> : null}
      {files.length === 0 ? (
        <p className="file-list-empty">
          No files in this folder yet. Upload something or create another folder.
        </p>
      ) : (
        <div className="file-list-grid">
          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onDelete={handleDelete}
              onPreview={() => setPreviewFile(file)}
              onRename={() => setRenameFile(file)}
              onShare={() => setShareFile(file)}
              onViewVersions={() => setVersionsFile(file)}
            />
          ))}
        </div>
      )}

      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
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

      {shareFile && (
        <ShareModal file={shareFile} onClose={() => setShareFile(null)} />
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