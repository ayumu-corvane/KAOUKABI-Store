import { db, OWNER_UID, authenticate } from '../server/firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const messageId = String(req.body?.messageId || '').trim();
    const conversationToken = String(req.body?.conversationToken || '').trim();
    const customerToken = String(req.body?.customerToken || '').trim();
    const action = String(req.body?.action || '').trim();
    if (!messageId || !/^[a-f0-9]{64}$/.test(conversationToken)) {
      return res.status(400).json({ error: 'Invalid message.' });
    }

    let isOwner = false;
    const authorization = String(req.headers.authorization || '');
    if (authorization.startsWith('Bearer ')) {
      const user = await authenticate(req);
      if (user.uid !== OWNER_UID) return res.status(403).json({ error: 'Only the KAOUKABI owner can delete messages here.' });
      isOwner = true;
    } else if (customerToken !== conversationToken) {
      return res.status(403).json({ error: 'You are not allowed to delete this message.' });
    }

    const ref = db.collection('activityEvents').doc(messageId);
    const snap = await ref.get();
    if (!snap.exists || snap.get('conversationToken') !== conversationToken ||
        !['contact_message', 'contact_reply'].includes(snap.get('type'))) {
      return res.status(404).json({ error: 'This message could not be found.' });
    }
    if (!isOwner && action === 'hide_for_customer') {
      if (snap.get('type') !== 'contact_reply') return res.status(403).json({ error: 'Only KAOUKABI replies can be hidden this way.' });
      await db.collection('customerHiddenMessages').doc(conversationToken + '_' + messageId).set({ conversationToken, messageId, hiddenAt: new Date() });
      return res.status(200).json({ ok: true, hiddenForCustomer: true });
    }
    if (!isOwner && snap.get('type') !== 'contact_message') {
      return res.status(403).json({ error: 'You can only delete messages you sent.' });
    }
    await ref.delete();
    return res.status(200).json({ ok: true });
  } catch (error) {
    const status = error.message === 'Authentication required.' ? 401 : 500;
    console.error('Contact message deletion failed:', error.message);
    return res.status(status).json({ error: status === 401 ? error.message : 'The message could not be deleted.' });
  }
}
