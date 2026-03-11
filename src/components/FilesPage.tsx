import { useCallback, useEffect, useMemo, useState } from 'react'
import { generateClient } from 'aws-amplify/data'
import { useSearchParams } from 'react-router-dom'
import type { Schema } from '../../amplify/data/resource'
import { getCurrentUserContext } from '../utils/authSession'
import ConfirmDialog from './ConfirmDialog'
import FileList from './FileList'
import FileUpload from './FileUpload'
import { useToast } from './toastContext'
import './FilesPage.css'

const client = generateClient<Schema>()

type Folder = Schema['Folder']['type']
type FileRecord = Schema['FileRecord']['type']

function sortFolders(left: Folder, right: Folder) {
  return left.name.localeCompare(right.name)
}

function collectDescendantFolders(rootFolderId: string, folderMap: Map<string, Folder>) {
  const descendants: Folder[] = []
  const stack = [rootFolderId]

  while (stack.length > 0) {
    const currentId = stack.pop()!

    for (const folder of folderMap.values()) {
      if (folder.parentFolderId === currentId) {
        descendants.push(folder)
        stack.push(folder.id)
      }
    }
  }

  return descendants
}

function FilesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [folderName, setFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null)
  const [folderDeleteBusy, setFolderDeleteBusy] = useState(false)
  const [fileListRefreshToken, setFileListRefreshToken] = useState(0)
  const { showToast } = useToast()

  const activeFolderId = searchParams.get('folder')

  const loadFolders = useCallback(async () => {
    try {
      const { owner } = await getCurrentUserContext()
      const { data } = await client.models.Folder.list({
        filter: { owner: { eq: owner } },
      })
      setFolders([...data].sort(sortFolders))
    } catch (error) {
      console.error('Failed to load folders', error)
      showToast('Failed to load folders.', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void loadFolders()
  }, [loadFolders])

  useEffect(() => {
    if (activeFolderId && !folders.some((folder) => folder.id === activeFolderId)) {
      setSearchParams((current) => {
        current.delete('folder')
        return current
      }, { replace: true })
    }
  }, [activeFolderId, folders, setSearchParams])

  const folderMap = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders]
  )

  const activeFolder = activeFolderId ? folderMap.get(activeFolderId) ?? null : null

  const breadcrumbFolders = useMemo(() => {
    if (!activeFolder) {
      return []
    }

    const ancestors: Folder[] = []
    let cursor: Folder | undefined = activeFolder

    while (cursor) {
      ancestors.unshift(cursor)
      cursor = cursor.parentFolderId ? folderMap.get(cursor.parentFolderId) : undefined
    }

    return ancestors
  }, [activeFolder, folderMap])

  const childFolders = useMemo(
    () => folders.filter((folder) => (folder.parentFolderId ?? null) === (activeFolderId ?? null)),
    [activeFolderId, folders]
  )

  const listOwnerFiles = useCallback(async (): Promise<FileRecord[]> => {
    const { owner } = await getCurrentUserContext()
    const { data } = await client.models.FileRecord.list({
      filter: { owner: { eq: owner } },
    })

    return data
  }, [])

  const handleCreateFolder = useCallback(async () => {
    const trimmedName = folderName.trim()
    if (!trimmedName || creatingFolder) {
      return
    }

    const duplicate = childFolders.some(
      (folder) => folder.name.toLowerCase() === trimmedName.toLowerCase()
    )

    if (duplicate) {
      showToast('A folder with that name already exists here.', 'error')
      return
    }

    setCreatingFolder(true)

    try {
      const { owner } = await getCurrentUserContext()
      await client.models.Folder.create({
        name: trimmedName,
        owner,
        parentFolderId: activeFolderId ?? undefined,
      })
      setFolderName('')
      await loadFolders()
      showToast(`Created folder ${trimmedName}.`, 'success')
    } catch (error) {
      console.error('Failed to create folder', error)
      showToast('Failed to create folder.', 'error')
    } finally {
      setCreatingFolder(false)
    }
  }, [activeFolderId, childFolders, creatingFolder, folderName, loadFolders, showToast])

  const openFolder = useCallback(
    (folderId: string | null) => {
      setSearchParams((current) => {
        current.delete('folder')
        if (folderId) {
          current.set('folder', folderId)
        }
        return current
      })
    },
    [setSearchParams]
  )

  const handleDeleteFolder = useCallback(async () => {
    if (!folderToDelete || folderDeleteBusy) {
      return
    }

    setFolderDeleteBusy(true)

    try {
      const descendants = collectDescendantFolders(folderToDelete.id, folderMap)
      const folderIdsToDelete = new Set<string>([folderToDelete.id, ...descendants.map((folder) => folder.id)])
      const ownerFiles = await listOwnerFiles()
      const filesInFolders = ownerFiles.filter((file) =>
        file.folderId ? folderIdsToDelete.has(file.folderId) : false
      )

      await Promise.all(filesInFolders.map((file) => client.models.FileRecord.delete({ id: file.id })))

      const depthByFolderId = new Map<string, number>()
      for (const folder of descendants) {
        let depth = 0
        let cursor: Folder | undefined = folder

        while (cursor?.parentFolderId && folderIdsToDelete.has(cursor.parentFolderId)) {
          depth += 1
          cursor = folderMap.get(cursor.parentFolderId)
        }

        depthByFolderId.set(folder.id, depth)
      }

      const foldersByDepth = [...descendants].sort(
        (left, right) => (depthByFolderId.get(right.id) ?? 0) - (depthByFolderId.get(left.id) ?? 0)
      )

      for (const folder of foldersByDepth) {
        await client.models.Folder.delete({ id: folder.id })
      }

      await client.models.Folder.delete({ id: folderToDelete.id })

      if (activeFolderId && folderIdsToDelete.has(activeFolderId)) {
        openFolder(null)
      }

      setFolderToDelete(null)
      setFileListRefreshToken((current) => current + 1)
      await loadFolders()

      const deletedFileCount = filesInFolders.length
      const deletedFolderCount = descendants.length + 1
      showToast(
        `Deleted ${deletedFolderCount} folder${deletedFolderCount === 1 ? '' : 's'} and ${deletedFileCount} file${deletedFileCount === 1 ? '' : 's'}.`,
        'success'
      )
    } catch (error) {
      console.error('Failed to delete folder tree', error)
      showToast('Failed to delete folder.', 'error')
    } finally {
      setFolderDeleteBusy(false)
    }
  }, [activeFolderId, folderDeleteBusy, folderMap, folderToDelete, listOwnerFiles, loadFolders, openFolder, showToast])

  const closeFolderDeleteDialog = useCallback(() => {
    if (folderDeleteBusy) {
      return
    }

    setFolderToDelete(null)
  }, [folderDeleteBusy])

  return (
    <section className="files-page">
      <aside className="files-sidebar">
        <div className="sidebar-card">
          <p className="sidebar-label">Folders</p>
          <button
            type="button"
            className={`folder-link ${activeFolderId ? '' : 'folder-link-active'}`}
            onClick={() => openFolder(null)}
          >
            All files
          </button>
          {loading ? (
            <p className="sidebar-empty">Loading folders...</p>
          ) : folders.length === 0 ? (
            <p className="sidebar-empty">No folders yet.</p>
          ) : (
            <div className="folder-list">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className={`folder-link ${activeFolderId === folder.id ? 'folder-link-active' : ''}`}
                  onClick={() => openFolder(folder.id)}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeFolder && (
          <div className="sidebar-card">
            <p className="sidebar-label">Current folder</p>
            <strong className="sidebar-current-folder">{activeFolder.name}</strong>
            <p className="sidebar-helper-copy">
              Deleting this folder will also delete every nested folder and file inside it.
            </p>
            <button
              type="button"
              className="folder-delete-button"
              onClick={() => setFolderToDelete(activeFolder)}
            >
              Delete folder
            </button>
          </div>
        )}

        <div className="sidebar-card">
          <p className="sidebar-label">Create folder</p>
          <input
            className="folder-input"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="Folder name"
            maxLength={80}
          />
          <button type="button" className="folder-create-button" onClick={handleCreateFolder}>
            {creatingFolder ? 'Creating...' : 'New folder'}
          </button>
        </div>
      </aside>

      <div className="files-content">
        <div className="files-header">
          <div className="files-breadcrumbs">
            <button type="button" className="crumb-button" onClick={() => openFolder(null)}>
              Home
            </button>
            {breadcrumbFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className="crumb-button"
                onClick={() => openFolder(folder.id)}
              >
                {folder.name}
              </button>
            ))}
          </div>
          <div className="files-title-row">
            <div>
              <p className="files-kicker">Files</p>
              <h2>{activeFolder?.name ?? 'All files'}</h2>
            </div>
            <p className="files-summary">
              {folders.length} folder{folders.length === 1 ? '' : 's'} total · {childFolders.length}{' '}
              visible here
            </p>
          </div>
        </div>

        {childFolders.length > 0 && (
          <section className="folder-grid-section">
            <div className="section-heading">
              <h3>Folders</h3>
            </div>
            <div className="folder-grid">
              {childFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className="folder-card"
                  onClick={() => openFolder(folder.id)}
                >
                  <span className="folder-card-label">Folder</span>
                  <strong>{folder.name}</strong>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="files-section">
          <h2 className="file-list-title">Your Files</h2>
          <FileUpload activeFolderId={activeFolderId} />
          <FileList
            activeFolderId={activeFolderId}
            refreshToken={fileListRefreshToken}
            showTitle={false}
          />
        </section>

        {folderToDelete && (
          <ConfirmDialog
            title="Delete folder"
            message={`Delete ${folderToDelete.name}, every nested folder, and every file inside them? This cannot be undone.`}
            confirmLabel="Delete folder"
            tone="danger"
            busy={folderDeleteBusy}
            onConfirm={handleDeleteFolder}
            onCancel={closeFolderDeleteDialog}
          />
        )}
      </div>
    </section>
  )
}

export default FilesPage