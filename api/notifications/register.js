import { createHash } from 'node:crypto';
import { authenticate, db } from '../../server/firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await authenticate(req);
    const token = String(req.body?.token || '');
    if (token.length < 40 || token.length > 4096) return res.status(400).json({ error: 'Invalid notification token.' });
    const id = createHash('sha256').update(token).digest('hex').slice(0, 32);
    await db.collection('pushTokens').doc(id).set({ uid: user.uid, token, updatedAt: new Date() }, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Push registration failed:', error.message);
    return res.status(401).json({ error: 'Could not register notifications. Please sign in again.' });
  }
}
