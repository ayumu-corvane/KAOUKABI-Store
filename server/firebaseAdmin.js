import admin from 'firebase-admin';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
const serviceAccount = JSON.parse(raw);
const app = admin.apps.length ? admin.app() : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
export const auth = admin.auth(app);
export const db = admin.firestore(app);
export const messaging = admin.messaging(app);
export const OWNER_UID = 'I3cbfcsV51XOvXGd11U4QEJBmeH3';
export async function authenticate(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw new Error('Authentication required.');
  return auth.verifyIdToken(header.slice(7));
}
