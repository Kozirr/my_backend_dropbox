import { useState } from 'react'
import type { Schema } from '../../amplify/data/resource'
import './RenameModal.css'

type FileRecord = Schema['FileRecord']['type']

interface RenameModalProps {
  file: FileRecord
  onRename: (file: FileRecord, newName: string) => void
  onClose: () => void
}

function RenameModal({ file, onRename, onClose }: RenameModalProps) {
  const [newName, setNewName] = useState(file.fileName)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed || trimmed === file.fileName) return
    onRename(file, trimmed)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content rename-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Rename File</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
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
            autoFocus
          />
          <div className="rename-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-rename-submit"
              disabled={!newName.trim() || newName.trim() === file.fileName}
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RenameModal
