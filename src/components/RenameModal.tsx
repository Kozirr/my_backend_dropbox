import { useState } from 'react'
import type { Schema } from '../../amplify/data/resource'
import './RenameModal.css'

type FileRecord = Schema['FileRecord']['type']

interface RenameModalProps {
  file: FileRecord
  onRename: (file: FileRecord, newName: string) => void
  busy?: boolean
  onClose: () => void
}

function RenameModal({ file, onRename, busy = false, onClose }: RenameModalProps) {
  const [newName, setNewName] = useState(file.fileName)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed || trimmed === file.fileName || busy) return
    onRename(file, trimmed)
  }

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="modal-content rename-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Rename File</h3>
          <button className="modal-close" onClick={onClose} disabled={busy}>✕</button>
        </div>
        <form className="rename-form" onSubmit={handleSubmit}>
          <label className="rename-label" htmlFor="rename-input">
            New file name
          </label>
          <input
            id="rename-input"
            type="text"
            className="rename-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={busy}
            autoFocus
          />
          <p className="rename-help-text">
            Renaming updates every saved version so the full history stays grouped under the new name.
          </p>
          <div className="rename-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-rename-submit"
              disabled={!newName.trim() || newName.trim() === file.fileName || busy}
            >
              {busy ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RenameModal
