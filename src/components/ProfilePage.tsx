import { useCallback, useEffect, useState } from 'react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import { getCurrentUserContext } from '../utils/authSession'
import { useToast } from './toastContext'
import './ProfilePage.css'

const client = generateClient<Schema>()

type UserProfile = Schema['UserProfile']['type']

function getDefaultDisplayName(email: string) {
  return email.split('@')[0].replace(/[._-]+/g, ' ')
}

function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [accentColor, setAccentColor] = useState('#2b6fff')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const { owner, email: userEmail } = await getCurrentUserContext()
        const { data } = await client.models.UserProfile.list({
          filter: { owner: { eq: owner } },
        })
        const existing = data[0] ?? null

        if (!cancelled) {
          setProfile(existing)
          setEmail(userEmail)
          setDisplayName(existing?.displayName ?? getDefaultDisplayName(userEmail))
          setAccentColor(existing?.accentColor ?? '#2b6fff')
        }
      } catch (error) {
        console.error('Failed to load profile', error)
        showToast('Failed to load your profile.', 'error')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [showToast])

  const handleSave = useCallback(async () => {
    const trimmedName = displayName.trim()

    if (!trimmedName) {
      showToast('Display name is required.', 'error')
      return
    }

    setSaving(true)

    try {
      const { owner } = await getCurrentUserContext()

      if (profile) {
        await client.models.UserProfile.update({
          id: profile.id,
          displayName: trimmedName,
          accentColor,
        })
      } else {
        const { data } = await client.models.UserProfile.create({
          displayName: trimmedName,
          accentColor,
          owner,
        })
        setProfile(data)
      }

      window.dispatchEvent(new Event('profileUpdated'))
      showToast('Profile updated.', 'success')
    } catch (error) {
      console.error('Failed to save profile', error)
      showToast('Failed to save profile.', 'error')
    } finally {
      setSaving(false)
    }
  }, [accentColor, displayName, profile, showToast])

  if (loading) {
    return <div className="profile-page">Loading profile...</div>
  }

  return (
    <section className="profile-page">
      <div className="profile-hero">
        <div>
          <p className="profile-kicker">Account settings</p>
          <h2>Edit your profile</h2>
          <p className="profile-copy">
            Keep your workspace identity up to date. These values are stored in your app profile
            and drive the header presentation.
          </p>
        </div>
        <div className="profile-avatar" style={{ background: accentColor }}>
          {displayName.trim().slice(0, 1).toUpperCase() || 'U'}
        </div>
      </div>

      <div className="profile-card">
        <label className="profile-label" htmlFor="profile-email">
          Email
        </label>
        <input id="profile-email" className="profile-input" value={email} disabled />

        <label className="profile-label" htmlFor="profile-display-name">
          Display name
        </label>
        <input
          id="profile-display-name"
          className="profile-input"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={80}
        />

        <label className="profile-label" htmlFor="profile-accent-color">
          Accent color
        </label>
        <div className="profile-color-row">
          <input
            id="profile-accent-color"
            type="color"
            className="profile-color-input"
            value={accentColor}
            onChange={(event) => setAccentColor(event.target.value)}
          />
          <span className="profile-color-value">{accentColor}</span>
        </div>

        <button type="button" className="profile-save-button" onClick={handleSave}>
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </div>
    </section>
  )
}

export default ProfilePage