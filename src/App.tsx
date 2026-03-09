import AuthWrapper from './components/AuthWrapper'
import AppContent from './components/AppContent'
import ToastProvider from './components/ToastProvider'

function App() {
  return (
    <ToastProvider>
      <AuthWrapper>
        {() => <AppContent />}
      </AuthWrapper>
    </ToastProvider>
  )
}

export default App
