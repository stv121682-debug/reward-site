// POST /api/create-payment  (Authorization: Bearer <Firebase ID token>)
// Creates a PayConfirm payment for the current product price and an order doc in Firestore.
const { fb } = require('./_lib');
const HOLD = 14 * 60 * 1000; // keep below PayConfirm HOLD_MINUTES (15)

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const admin = fb(), db = admin.firestore();
    const tok = (req.headers.authorization || '').replace(/^Bearer /, '');
    const uid = (await admin.auth().verifyIdToken(tok)).uid;

    const p = (await db.doc('settings/product').get()).data() || {};
    const price = Math.round((+p.price || 0) * 100) / 100;
    if (p.active !== true || !(price > 0)) return res.status(400).json({ error: 'This product is not available for payment.' });

    const user = (await db.doc('users/' + uid).get()).data();
    if (!user) return res.status(400).json({ error: 'Account not found.' });

    const mine = (await db.collection('orders').where('uid', '==', uid).get()).docs;
    if (mine.some(d => d.data().status === 'confirmed')) return res.status(409).json({ error: 'You already own this.' });

    const now = Date.now();
    const reuse = mine.find(d => { const o = d.data(); return o.status === 'pending' && o.via === 'payconfirm' && now - o.ts < HOLD && o.amount === price; });
    let orderId;
    if (reuse) orderId = reuse.id;
    else {
      for (const d of mine) if (d.data().status === 'pending') await d.ref.update({ status: 'expired' });
      orderId = uid + '_' + now;
    }

    const r = await fetch(process.env.PAYCONFIRM_URL.replace(/\/$/, '') + '/api/payments', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.PAYCONFIRM_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, amount: price })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { console.error('PayConfirm error', r.status, j); return res.status(502).json({ error: 'Payment system is busy. Try again.' }); }

    if (!reuse) await db.doc('orders/' + orderId).set({
      uid, name: user.name, phone: user.phone, product: p.name, amount: price,
      payAmount: j.amount, payAmountPaise: Math.round(parseFloat(j.amount) * 100),
      paymentId: j.paymentId, via: 'payconfirm', utr: '', status: 'pending', note: '', ts: now
    });
    res.json({ orderId, amount: j.amount, upiLink: j.upiLink, payUrl: j.payUrl, expiresAt: j.expiresAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not start payment.' });
  }
};
