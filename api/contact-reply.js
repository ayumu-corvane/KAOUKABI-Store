import { db, OWNER_UID, authenticate } from '../server/firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await authenticate(req);
    if (user.uid !== OWNER_UID) return res.status(403).json({ error: 'Only the KAOUKABI owner can reply.' });
    const messageId = String(req.body?.messageId || '').trim();
    const conversationToken = String(req.body?.conversationToken || '').trim();
    const message = String(req.body?.message || '').trim().slice(0, 5000);
    if (!messageId || !/^[a-f0-9]{64}$/.test(conversationToken) || message.length < 1) {
      return res.status(400).json({ error: 'Please write a reply.' });
    }
    const original = await db.collection('activityEvents').doc(messageId).get();
    if (!original.exists || original.get('type') !== 'contact_message' || original.get('conversationToken') !== conversationToken) {
      return res.status(404).json({ error: 'The original message could not be found.' });
    }
    await db.collection('activityEvents').add({
      type: 'contact_reply',
      conversationToken,
      messageId,
      message,
      createdAt: new Date()
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    const status = error.message === 'Authentication required.' ? 401 : 500;
    console.error('Contact reply failed:', error.message);
    return res.status(status).json({ error: status === 401 ? error.message : 'Your reply could not be sent.' });
  }
}
