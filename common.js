/* Shared helpers for the customer app and the admin dashboard */
(function () {
  const W = window;
  W.$ = id => document.getElementById(id);
  W.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  W.fmt = n => '₹' + (Math.round((+n || 0) * 100) / 100).toFixed(2);
  W.dayNo = () => Math.floor(Date.now() / 86400000);           // UTC day number (the rules check the same value)
  W.fdate = ms => ms ? new Date(ms).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
  W.ytId = url => {
    url = String(url || '').trim();
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(url) ? url : '');
  };
  W.normPhone = p => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 12 && d.startsWith('91')) d = d.slice(2); if (d.length === 11 && d.startsWith('0')) d = d.slice(1); return d; };
  W.okPhone = p => /^[6-9]\d{9}$/.test(p);
  W.DEF = { brand: 'ATM Rewards', telegram: '', whatsapp: '', waMsg: 'hii', minWithdraw: 50, banners: '', notice: '' };
  // Product shown in the store. Admin edits it in Dashboard -> Product (stored at settings/product).
  W.DEFP = { name: 'Premium Pack', desc: '', price: 0, active: false, upi: '', payee: '' };
  W.getProduct = async () => {
    try { const s = await db.collection('settings').doc('product').get(); return Object.assign({}, W.DEFP, s.exists ? s.data() : {}); }
    catch (e) { return Object.assign({}, W.DEFP); }
  };
  W.toast = (m, bad) => {
    let t = $('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = m; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(t._t); t._t = setTimeout(() => { t.className = ''; }, 3400);
  };
  W.setupOk = () => !!(W.FB_CONFIG && W.FB_CONFIG.apiKey && !/^YOUR/.test(W.FB_CONFIG.apiKey) && W.firebase);
  if (W.setupOk()) { firebase.initializeApp(W.FB_CONFIG); W.auth = firebase.auth(); W.db = firebase.firestore(); }
  W.getSettings = async () => {
    try { const s = await db.collection('settings').doc('app').get(); return Object.assign({}, W.DEF, s.exists ? s.data() : {}); }
    catch (e) { return Object.assign({}, W.DEF); }
  };
  W.maskEmail = e => { const [a, b] = String(e).split('@'); return (a || '').slice(0, 2) + '***@' + (b || ''); };

  // ---------- ATM illustrations (drawn here, no copyrighted images) ----------
  let n = 0;
  W.atmSvg = function (v) {
    n++; const id = 'a' + n;
    const coins = (x, y) => `<ellipse cx="${x}" cy="${y + 12}" rx="17" ry="6" fill="#b8860b"/><ellipse cx="${x}" cy="${y + 6}" rx="17" ry="6" fill="#d9a62a"/><ellipse cx="${x}" cy="${y}" rx="17" ry="6" fill="#f2c94c"/><text x="${x}" y="${y + 3}" text-anchor="middle" font-size="8" font-weight="700" fill="#8a6200">₹</text>`;
    const note = (x, y, r) => `<g transform="rotate(${r} ${x} ${y})"><rect x="${x - 22}" y="${y - 11}" width="44" height="22" rx="3" fill="#8fd19e" stroke="#2f7d4a"/><circle cx="${x}" cy="${y}" r="6" fill="#5fb878"/><text x="${x}" y="${y + 3}" text-anchor="middle" font-size="8" font-weight="700" fill="#145c32">₹</text></g>`;
    const atm = (cx, s) => `<g transform="translate(${cx - 55 * s} ${100 - 82 * s}) scale(${s})">
      <rect x="0" y="0" width="110" height="164" rx="11" fill="#2d3b34" stroke="#0d1813" stroke-width="3"/>
      <rect x="8" y="8" width="94" height="17" rx="4" fill="#0b5a3d"/><text x="55" y="21" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" letter-spacing="3">ATM</text>
      <rect x="10" y="32" width="90" height="50" rx="5" fill="url(#${id})" stroke="#0d1813" stroke-width="2"/>
      <text x="55" y="52" text-anchor="middle" font-size="9" font-weight="700" fill="#06402B">WELCOME</text><text x="55" y="68" text-anchor="middle" font-size="12" font-weight="800" fill="#06402B">₹ 0000</text>
      ${[0, 1, 2, 3].map(r => [0, 1, 2].map(c => `<rect x="${16 + c * 18}" y="${92 + r * 12}" width="14" height="8" rx="2" fill="#cfd8d2"/>`).join('')).join('')}
      <rect x="78" y="92" width="22" height="22" rx="3" fill="#1a2420"/><rect x="82" y="100" width="14" height="3" fill="#ffd23f"/>
      <rect x="14" y="146" width="82" height="11" rx="3" fill="#0a100d"/><rect x="26" y="141" width="58" height="12" rx="2" fill="#8fd19e" stroke="#2f7d4a"/>
    </g>`;
    const defs = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8f5d2"/><stop offset="1" stop-color="#4fc58f"/></linearGradient></defs>`;
    let body;
    if (v % 3 === 0) body = atm(150, 1) + coins(52, 150) + coins(252, 160) + note(255, 70, 18) + note(48, 70, -14);
    else if (v % 3 === 1) body = atm(105, .86) + atm(205, .86) + coins(150, 168) + note(150, 28, 8);
    else body = atm(150, 1.02) + note(58, 120, -20) + note(246, 110, 16) + coins(250, 165) + coins(48, 165);
    return `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ATM machine">${defs}${body}</svg>`;
  };
})();
