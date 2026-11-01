# ATM Rewards – setup (no deposits, money = 0)

Customers watch sponsored YouTube videos, earn reward points, and request a withdrawal to UPI/bank. The admin pays manually.

Files: `index.html` (customer app) · `admin.html` (dashboard) · `common.js` · `style.css` · `firebase-config.js` · `firestore.rules`

## 1. Firebase
1. https://console.firebase.google.com → Add project.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** (production mode).
4. **Firestore → Rules** → paste everything from `firestore.rules` → Publish.
5. **Project settings → Your apps → Web (`</>`)** → copy the config values into `firebase-config.js` (apiKey, authDomain, projectId, appId).
6. **Authentication → Settings → Authorized domains** → add your Vercel domain (e.g. `yourapp.vercel.app`).

## 2. Create the admin
1. Authentication → Users → **Add user** (your client's email + password).
2. Copy that user's **UID**.
3. Firestore → Start collection `admins` → Document ID = the UID → add any field, e.g. `ok: true`.
4. Open `/admin.html` and log in. Go to **Settings** and fill: brand name, Telegram link, WhatsApp number (e.g. `919876543210`), min withdrawal.

## 3. Deploy (Vercel)
Put all files in one folder, push to GitHub, import in Vercel (framework: Other). Or drag the folder into https://vercel.com/new.

## How it works
- **Login:** phone number + password. Forgot password sends a reset email to the email used at signup.
- **Register:** name, phone, email, password, UPI and/or bank details, optional referral code (`?ref=CODE` links prefill it).
- **Earn:** admin adds an ad (YouTube link, reward ₹, min seconds). Customer opens it, video plays, time counts only while playing; reward is credited once per ad per day. Every open is counted as a click and shown in Admin → Ads.
- **Withdraw:** creates a request in Admin → Withdrawals with name, phone, UPI/bank details and amount. Admin pays outside the app and presses **Mark paid** (or **Reject**).
- **Telegram button:** opens the link set in Admin → Settings. **Service:** opens `wa.me/<number>?text=hii`.
- **Team:** members who joined with your code. **Share:** QR, code, link.

## Notes
- Balance = rewards earned − non-rejected withdrawals, computed in the app. Always check the customer balance shown in the Withdrawals table before paying.
- Without paid Cloud Functions, rewards are secured by the Firestore rules (one reward per ad per day, reward must equal the ad's value). A determined user could fake watch time; you pay manually, so review unusual accounts.
- Test the rules in Firestore → Rules → Playground before going live.
- Keep ad rewards funded by real advertisers. Do not promise returns on money paid in.

---

# Store product: dynamic price + PayConfirm (automatic)

**Admin -> Product tab:** name, description, **price (Rs, 0 = free)**, and *Show product*. Change the price any time.

**Customer:** Home -> *Store* card.
- Price **0** -> "Get free" unlocks instantly.
- Price **> 0** -> the app calls `/api/create-payment`, which creates a PayConfirm payment with a unique amount (e.g. Rs 499.37). Customer scans the QR / taps "Pay with UPI app". When PayConfirm detects the credit it calls `/api/payconfirm-webhook`, the order becomes *confirmed* and the customer's screen unlocks by itself.
- **Fallback:** if a payment produced no bank alert, Admin -> Orders -> **Mark paid** (only after checking your bank). Expired orders can also be marked paid.

## Connect PayConfirm (do this once)
1. Run your PayConfirm server on a VPS or tunnel with HTTPS (it needs the phone watcher, so it cannot run on Vercel). In its `.env` set:
   ```
   CALLBACK_URL=https://YOUR-APP.vercel.app/api/payconfirm-webhook
   CALLBACK_SECRET=<long random string>
   ```
2. Firebase console -> Project settings -> **Service accounts** -> *Generate new private key* (JSON).
3. Vercel -> Project -> Settings -> **Environment Variables** (then redeploy):

| Name | Value |
|---|---|
| `PAYCONFIRM_URL` | your PayConfirm server URL, e.g. `https://pay.yourdomain.com` |
| `PAYCONFIRM_API_KEY` | PayConfirm `API_KEY` |
| `PAYCONFIRM_CALLBACK_SECRET` | same as PayConfirm `CALLBACK_SECRET` |
| `FIREBASE_SERVICE_ACCOUNT` | the whole service-account JSON, pasted as one value |

4. Re-publish `firestore.rules` (paid orders are now created only by the server). Open Admin once so `settings/product` exists.

Never put `API_KEY`, the service-account JSON or the callback secret in `index.html`, `common.js` or git.

# Deploy: Firebase + Git + Vercel (copy-paste)

```bash
# 1) Firebase rules (optional CLI way; or paste firestore.rules in console)
npm i -g firebase-tools
firebase login
# edit .firebaserc -> your project id
firebase deploy --only firestore:rules

# 2) Git
git init
git add .
git commit -m "Rewards site with store"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main

# 3) Vercel
npm i -g vercel
vercel          # first deploy (framework: Other, output dir: .)
vercel --prod   # go live
```
Then add the Vercel domain in Firebase → Authentication → Settings → Authorized domains.
(Or: vercel.com/new → import the GitHub repo → Deploy. Every `git push` redeploys.)
