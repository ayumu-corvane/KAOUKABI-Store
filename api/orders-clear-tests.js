import { db, OWNER_UID, authenticate } from '../server/firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await authenticate(req);
    if (user.uid !== OWNER_UID) return res.status(403).json({ error: 'Only the KAOUKABI owner can clear test orders.' });

    const snapshot = await db.collection('orders').get();
    const deletedIds = snapshot.docs.map(doc => doc.id);
    for (let i = 0; i < snapshot.docs.length; i += 450) {
      const batch = db.batch();
      snapshot.docs.slice(i, i + 450).forEach(order => batch.delete(order.ref));
      await batch.commit();
    }
    return res.status(200).json({ ok: true, deletedCount: deletedIds.length, deletedIds });
  } catch (error) {
    const status = error.message === 'Authentication required.' ? 401 : 500;
    console.error('Clearing test orders failed:', error.message);
    return res.status(status).json({ error: status === 401 ? error.message : 'Test orders could not be cleared.' });
  }
}