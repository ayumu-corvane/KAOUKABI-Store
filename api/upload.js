import { put } from '@vercel/blob';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const PROJECT_ID = 'kaoukabi-c5ad9';
const OWNER_UID = 'I3cbfcsV51XOvXGd11U4QEJBmeH3';
const GOOGLE_KEYS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Please sign in as the KAOUKABI owner.' });

    const { payload } = await jwtVerify(token, GOOGLE_KEYS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    const tokenEmail = String(payload.email || '').trim().toLowerCase();
    const ownerByUid = payload.sub === OWNER_UID;
    const ownerByVerifiedEmail = tokenEmail === 'ayumucorvane@gmail.com' && payload.email_verified === true;
    if (!ownerByUid && !ownerByVerifiedEmail) {
      return res.status(403).json({ error: 'Only the KAOUKABI owner can upload product pictures.' });
    }

    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(contentType)) {
      return res.status(415).json({ error: 'Please upload a JPG, PNG, WEBP, GIF, or AVIF image.' });
    }

    const size = Number(req.headers['content-length'] || 0);
    if (size > 4 * 1024 * 1024) {
      return res.status(413).json({ error: 'Each picture must be smaller than 4 MB.' });
    }

    const requestUrl = new URL(req.url, `https://${req.headers.host || 'kaoukabi-store.vercel.app'}`);
    const originalName = requestUrl.searchParams.get('filename') || 'product-image';
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100) || 'product-image';
    const blob = await put(`products/${Date.now()}-${safeName}`, req, {
      access: 'public',
      addRandomSuffix: true,
      contentType,
    });

    return res.status(200).json({ url: blob.url });
  } catch (error) {
    console.error('KAOUKABI image upload failed:', error);
    return res.status(500).json({ error: 'The picture could not be uploaded. Please try again.' });
  }
}
