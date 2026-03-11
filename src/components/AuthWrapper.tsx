import { Authenticator } from '@aws-amplify/ui-react'
import type { AuthenticatorProps } from '@aws-amplify/ui-react'
import { I18n } from 'aws-amplify/utils'
import '@aws-amplify/ui-react/styles.css'
import './AuthWrapper.css'

interface AuthWrapperProps {
  children: AuthenticatorProps['children']
}

I18n.setLanguage('en')
I18n.putVocabulariesForLanguage('en', {
  Username: 'Email',
  'Enter your Username': 'Enter your email',
  'Enter your username': 'Enter your email',
  'Incorrect username or password.': 'Invalid credentials',
  'Incorrect username or password': 'Invalid credentials',
  'User does not exist': 'Invalid credentials',
  'User not found': 'Invalid credentials',
})

const formFields: NonNullable<AuthenticatorProps['formFields']> = {
  signIn: {
    username: {
      label: 'Email',
      placeholder: 'Enter your email',
      type: 'email',
      autocomplete: 'email',
      isRequired: true,
    },
  },
  signUp: {
    email: {
      label: 'Email',
      placeholder: 'Enter your email',
      type: 'email',
      autocomplete: 'email',
      order: 1,
      isRequired: true,
    },
    password: {
      label: 'Password',
      placeholder: 'Enter your password',
      order: 2,
      isRequired: true,
    },
    confirm_password: {
      label: 'Confirm password',
      placeholder: 'Confirm your password',
      order: 3,
      isRequired: true,
    },
  },
}

function AuthWrapper({ children }: AuthWrapperProps) {
  return (
    <Authenticator
      className="auth-wrapper"
      loginMechanisms={['email']}
      signUpAttributes={['email']}
      formFields={formFields}
    >
      {children}
    </Authenticator>
  )
}

export default AuthWrapper
