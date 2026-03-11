import { useEffect, useState } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { generateClient } from 'aws-amplify/data'
import { Outlet } from 'react-router-dom'
import type { Schema } from '../../amplify/data/resource'
import { getCurrentUserContext } from '../utils/authSession'
import Header from './Header'
import './AppContent.css'

const client = generateClient<Schema>()

function AppContent() {
  const { user, signOut } = useAuthenticator()
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const { owner } = await getCurrentUserContext()
        const { data } = await client.models.UserProfile.list({
          filter: { owner: { eq: owner } },
        })

        if (!cancelled) {
          setDisplayName(data[0]?.displayName ?? '')
        }
      } catch (error) {
        console.error('Failed to load profile summary', error)
      }
    }

    void loadProfile()

    const handleProfileUpdated = () => {
      void loadProfile()
    }

    window.addEventListener('profileUpdated', handleProfileUpdated)
    return () => {
      cancelled = true
      window.removeEventListener('profileUpdated', handleProfileUpdated)
    }
  }, [])

  return (
    <div className="app-shell">
      <Header
        email={user?.signInDetails?.loginId ?? ''}
        displayName={displayName}
        onSignOut={signOut}
      />
      <main className="app-main-shell">
        <div className="app-main-surface">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AppContent
