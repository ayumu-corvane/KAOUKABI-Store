import { randomBytes } from 'node:crypto';
import { db, messaging, OWNER_UID } from '../server/firebaseAdmin.js';

const recentSubmissions = new Map();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const token = String(req.query?.conversationToken || '').trim();
      if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'Invalid conversation.' });
      const snap = await db.collection('activityEvents').where('conversationToken', '==', token).get();
      const hiddenSnap = await db.collection('customerHiddenMessages').where('conversationToken', '==', token).get();
      const hiddenIds = new Set(hiddenSnap.docs.map(d => d.get('messageId')));
      const messages = snap.docs.filter(d => !hiddenIds.has(d.id)).map(d => ({ id: d.id, ...d.data() })).sort((a,b) => {
        const ta = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
        const tb = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
        return ta - tb;
      });
      return res.status(200).json({ messages });
    } catch (error) {
      console.error('Contact conversation fetch failed:', error.message);
      return res.status(500).json({ error: 'Could not load your conversation.' });
    }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const now = Date.now();
    const recent = (recentSubmissions.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
    if (recent.length >= 5) return res.status(429).json({ error: 'Too many messages. Please try again in a little while.' });

    const name = String(req.body?.name || '').trim().slice(0, 100);
    const email = String(req.body?.email || '').trim().slice(0, 254).toLowerCase();
    const subject = String(req.body?.subject || '').trim().slice(0, 120);
    const message = String(req.body?.message || '').trim().slice(0, 5000);
    if (name.length < 2 || !emailPattern.test(email) || message.length < 10) {
      return res.status(400).json({ error: 'Please provide your name, a valid email address and a message of at least 10 characters.' });
    }

    recent.push(now);
    recentSubmissions.set(ip, recent);
    const conversationToken = randomBytes(32).toString('hex');
    const ref = await db.collection('activityEvents').add({
      type: 'contact_message', userName: name, email, subject, message, conversationToken,
      createdAt: new Date()
    });

    try {
      const tokenSnap = await db.collection('pushTokens').where('uid', '==', OWNER_UID).get();
      const tokens = [...new Set(tokenSnap.docs.map(d => d.get('token')).filter(Boolean))];
      for (let i = 0; i < tokens.length; i += 500) {
        const batch = tokens.slice(i, i + 500);
        const result = await messaging.sendEachForMulticast({
          tokens: batch,
          notification: {
            title: 'A new KAOUKABI message ✉️',
            body: name + ' sent you a message. Open your Owner Dashboard to reply.'
          },
          webpush: {
            fcmOptions: { link: '/?page=dashboard' },
            notification: { icon: '/kaoukabi-logo.webp', badge: '/kaoukabi-logo.webp' }
          }
        });
        result.responses.forEach((r, index) => {
          if (!r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(r.error?.code)) {
            const doc = tokenSnap.docs.find(d => d.get('token') === batch[index]);
            if (doc) doc.ref.delete().catch(() => {});
          }
        });
      }
    } catch (pushError) {
      console.error('Contact message push notification failed:', pushError.message);
    }

    return res.status(200).json({ ok: true, messageId: ref.id, conversationToken });
  } catch (error) {
    console.error('Contact message failed:', error.message);
    return res.status(500).json({ error: 'Your message could not be sent. Please try again.' });
  }
}
