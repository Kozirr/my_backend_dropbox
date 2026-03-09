import { useAuthenticator } from '@aws-amplify/ui-react'
import Header from './Header'
import FileUpload from './FileUpload'
import FileList from './FileList'
import './AppContent.css'

function AppContent() {
  const { user, signOut } = useAuthenticator()

  return (
    <div className="app">
      <Header email={user?.signInDetails?.loginId ?? ''} onSignOut={signOut} />
      <main className="app-main">
        <FileUpload />
        <FileList />
      </main>
    </div>
  )
}

export default AppContent
