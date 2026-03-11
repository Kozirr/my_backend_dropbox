import { useCallback, useEffect, useMemo, useState } from 'react'
import { generateClient } from 'aws-amplify/data'
import { useSearchParams } from 'react-router-dom'
import type { Schema } from '../../amplify/data/resource'
import { getCurrentUserContext } from '../utils/authSession'
import FileList from './FileList'
import FileUpload from './FileUpload'
import { useToast } from './toastContext'
import './FilesPage.css'

const client = generateClient<Schema>()

type Folder = Schema['Folder']['type']

function sortFolders(left: Folder, right: Folder) {
  return left.name.localeCompare(right.name)
}

function FilesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [folderName, setFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
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

  return (
    <section className="files-page">
      <aside className="files-sidebar">
        <div className="sidebar-card">
          <p className="sidebar-label">Spaces</p>
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

        <div className="sidebar-card">
          <p className="sidebar-label">Create folder</p>
          <input
            className="folder-input"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="Sprint files"
            maxLength={80}
          />
          <button type="button" className="folder-create-button" onClick={handleCreateFolder}>
            {creatingFolder ? 'Creating...' : 'New folder'}
          </button>
        </div>
      </aside>

      <div className="files-content">
        <div className="files-hero">
          <div>
            <p className="files-kicker">Dropbox-style workspace</p>
            <h2>{activeFolder?.name ?? 'All files'}</h2>
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
          </div>
          <div className="files-chip-stack">
            <span className="files-chip">Folders: {folders.length}</span>
            <span className="files-chip">Children here: {childFolders.length}</span>
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

        <FileUpload activeFolderId={activeFolderId} />
        <FileList activeFolderId={activeFolderId} />
      </div>
    </section>
  )
}

export default FilesPage