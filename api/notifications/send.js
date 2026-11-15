import { authenticate, db, messaging, OWNER_UID } from '../../server/firebaseAdmin.js';

const labels = { untouched: 'Still not touched', working: 'Working on it', shipped: 'Shipped', finished: 'Finished' };
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await authenticate(req);
    const { type, orderId } = req.body || {};
    if (!['new_order', 'order_status', 'order_received'].includes(type) || typeof orderId !== 'string') return res.status(400).json({ error: 'Invalid notification request.' });
    const orderSnap = await db.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) return res.status(404).json({ error: 'Order not found.' });
    const order = orderSnap.data();
    let recipientUid, title, body, url = '/';
    if (type === 'new_order') {
      if (order.userId !== user.uid) return res.status(403).json({ error: 'Not your order.' });
      recipientUid = OWNER_UID;
      title = 'A new KAOUKABI order 🎉';
      body = (order.userName || 'A customer') + ' just placed an order. Open the Owner Dashboard to check it.';
      url = '/?page=dashboard';
    } else if (type === 'order_status') {
      if (user.uid !== OWNER_UID) return res.status(403).json({ error: 'Owner access required.' });
      recipientUid = order.userId;
      const status = String(req.body.status || order.status);
      title = 'Your KAOUKABI order has an update';
      body = 'Order status: ' + (labels[status] || 'Updated') + '. Open KAOUKABI to see the details.';
      url = '/?page=account';
    } else {
      if (order.userId !== user.uid) return res.status(403).json({ error: 'Not your order.' });
      recipientUid = OWNER_UID;
      title = 'Order received 📦';
      body = (order.userName || 'A customer') + ' confirmed receiving ' + String(req.body.productName || 'an item') + '.';
      url = '/?page=dashboard';
    }
    const tokenSnap = await db.collection('pushTokens').where('uid', '==', recipientUid).get();
    const tokens = [...new Set(tokenSnap.docs.map(d => d.get('token')).filter(Boolean))];
    if (!tokens.length) return res.status(200).json({ ok: true, delivered: 0, reason: 'No registered devices for recipient.' });
    let sent = 0;
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      const result = await messaging.sendEachForMulticast({ tokens: batch, notification: { title, body }, webpush: { fcmOptions: { link: url }, notification: { icon: '/kaoukabi-logo.webp', badge: '/kaoukabi-logo.webp' } } });
      sent += result.successCount;
      result.responses.forEach((r, index) => {
        if (!r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(r.error?.code)) {
          const doc = tokenSnap.docs.find(d => d.get('token') === batch[index]);
          if (doc) doc.ref.delete().catch(() => {});
        }
      });
    }
    return res.status(200).json({ ok: true, delivered: sent });
  } catch (error) {
    console.error('Push send failed:', error.message);
    return res.status(401).json({ error: 'Notification could not be sent.' });
  }
}
