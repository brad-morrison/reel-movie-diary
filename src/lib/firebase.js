import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { firebaseConfig } from './firebaseConfig.js'

// Considered configured only once the placeholder values are replaced.
export const isFirebaseConfigured =
  !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('PASTE')

let auth
let db
let googleProvider

if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  googleProvider = new GoogleAuthProvider()
  // Offline cache: the diary keeps working with no connection and syncs later.
  db = initializeFirestore(app, {
    // Imported diary rows commonly omit optional fields such as year or TMDB
    // id. Firestore should omit those keys instead of rejecting the whole save.
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
}

export { auth, db, googleProvider }
