import { fetchAuthSession } from 'aws-amplify/auth'

export interface UserContext {
  email: string
  identityId: string
  owner: string
}

export async function getCurrentUserContext(): Promise<UserContext> {
  const session = await fetchAuthSession()
  const owner = session.tokens?.idToken?.payload?.sub as string | undefined
  const email = session.tokens?.idToken?.payload?.email as string | undefined

  if (!session.identityId || !owner || !email) {
    throw new Error('Unable to resolve the current authenticated user.')
  }

  return {
    email,
    identityId: session.identityId,
    owner,
  }
}