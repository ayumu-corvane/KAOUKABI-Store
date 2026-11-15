import { db, OWNER_UID, authenticate } from '../server/firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await authenticate(req);
    if (user.uid !== OWNER_UID) return res.status(403).json({ error: 'Only the KAOUKABI owner can create a sample order.' });

    const createdAt = new Date();
    const order = {
      userId: 'kaoukabi-demo-customer',
      userName: 'KAOUKABI Demo Customer',
      userEmail: 'demo@kaoukabi.example',
      shippingAddress: 'Demo address — not a real customer',
      items: [{
        productId: 'demo-everyday-edit',
        name: 'The Everyday Edit · Sample',
        color: 'Burgundy',
        size: 'M',
        category: 'Clothing',
        price: 490,
        quantity: 1,
        image: ''
      }],
      total: 490,
      status: 'untouched',
      paid: false,
      isDemo: true,
      createdAt
    };
    const ref = await db.collection('orders').add(order);
    return res.status(201).json({ ok: true, order: { id: ref.id, ...order } });
  } catch (error) {
    const status = error.message === 'Authentication required.' ? 401 : 500;
    console.error('Creating sample order failed:', error.message);
    return res.status(status).json({ error: status === 401 ? error.message : 'The sample order could not be created.' });
  }
}
