// POST /api/payconfirm-webhook  <- called by your PayConfirm server (set CALLBACK_URL to this)
const crypto = require('crypto');
const { fb } = require('./_lib');

const raw = req => new Promise((ok, no) => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); req.on('error', no); });

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = await raw(req);
    const ts = String(req.headers['x-payconfirm-timestamp'] || ''), sig = String(req.headers['x-payconfirm-signature'] || '');
    const exp = 'sha256=' + crypto.createHmac('sha256', process.env.PAYCONFIRM_CALLBACK_SECRET).update(ts + '.' + body).digest('hex');
    const a = Buffer.from(sig), b = Buffer.from(exp);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b) || Math.abs(Date.now() - Number(ts)) > 10 * 60 * 1000) return res.status(401).end();

    const e = JSON.parse(body.toString('utf8'));
    if (e.event === 'payment.paid' && e.orderId) {
      const db = fb().firestore(), ref = db.doc('orders/' + e.orderId);
      await db.runTransaction(async t => {
        const s = await t.get(ref);
        if (!s.exists) return;
        const o = s.data();
        if (o.status === 'confirmed') return;                       // webhooks can repeat
        if (o.payAmountPaise !== e.amountPaise) { t.update(ref, { note: 'Amount mismatch: got ' + e.amount }); return; }
        t.update(ref, { status: 'confirmed', utr: e.utr || '', note: 'Auto-confirmed', doneTs: Date.now() });
      });
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).end();                                           // PayConfirm will retry
  }
}
handler.config = { api: { bodyParser: false } };
module.exports = handler;
