import { useAuthenticator } from '@aws-amplify/ui-react'
import AuthWrapper from './components/AuthWrapper'
import Header from './components/Header'
import FileUpload from './components/FileUpload'
import FileList from './components/FileList'
import './App.css'

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

function App() {
  return (
    <AuthWrapper>
      {() => <AppContent />}
    </AuthWrapper>
  )
}

export default App
