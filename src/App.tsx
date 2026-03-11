import { Route, Routes } from 'react-router-dom'
import ProtectedApp from './components/ProtectedApp'
import SharedFilePage from './components/SharedFilePage'
import ToastProvider from './components/ToastProvider'

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/shared/:token" element={<SharedFilePage />} />
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </ToastProvider>
  )
}

export default App
