import { db, OWNER_UID, authenticate } from '../server/firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await authenticate(req);
    if (user.uid !== OWNER_UID) return res.status(403).json({ error: 'Only the KAOUKABI owner can delete orders.' });
    const orderId = String(req.body?.orderId || '').trim();
    if (!orderId || orderId.length > 160 || orderId.includes('/')) {
      return res.status(400).json({ error: 'A valid order ID is required.' });
    }
    const ref = db.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'This order no longer exists.' });
    await ref.delete();
    return res.status(200).json({ ok: true, deletedId: orderId });
  } catch (error) {
    const status = error.message === 'Authentication required.' ? 401 : 500;
    console.error('Deleting order failed:', error.message);
    return res.status(status).json({ error: status === 401 ? error.message : 'The order could not be deleted.' });
  }
}
