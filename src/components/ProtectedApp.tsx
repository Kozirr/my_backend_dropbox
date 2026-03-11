import { Navigate, Route, Routes } from 'react-router-dom'
import AuthWrapper from './AuthWrapper'
import AppContent from './AppContent'
import FilesPage from './FilesPage'
import ProfilePage from './ProfilePage'

function ProtectedApp() {
  return (
    <AuthWrapper>
      {() => (
        <Routes>
          <Route element={<AppContent />}>
            <Route index element={<Navigate to="/files" replace />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/files" replace />} />
        </Routes>
      )}
    </AuthWrapper>
  )
}

export default ProtectedApp