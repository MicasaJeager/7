# Free Server Deploy Guide

Bu loyiha bepul platformalarda quyidagi arxitektura bilan deploy qilinadi:

- Smart contract: Polygon Amoy (testnet)
- Backend API: Render (free web service)
- Frontend: Vercel yoki Netlify (free static site)
- Decentralized storage: Web3.Storage free token (ixtiyoriy)

## 1. Contract deploy (Polygon Amoy)

1. `contracts/.env` faylini yarating:
   - `AMOY_RPC_URL=<Alchemy yoki Infura Amoy RPC>`
   - `ISSUER_PRIVATE_KEY=<issuer wallet private key>`
2. Deploy:
   - `cd contracts`
   - `npm install`
   - `npm run deploy:amoy`
3. Konsoldagi `CredentialRegistry deployed: 0x...` manzilini saqlab qo'ying.

## 2. Backend deploy (Render)

1. Render akkaunt oching va GitHub repo'ni ulang.
2. New Web Service tanlang, root sifatida `backend` papkani ko'rsating.
3. Build command: `npm install`
4. Start command: `npm run start`
5. Environment variables qo'shing:
   - `PORT=4000`
   - `FRONTEND_ORIGIN=<frontend domeni>`
   - `RPC_URL=<Amoy RPC URL>`
   - `CONTRACT_ADDRESS=<deploy qilingan contract manzili>`
   - `ISSUER_PRIVATE_KEY=<issuer private key>`
   - `IPFS_TOKEN=<ixtiyoriy Web3.Storage token>`
6. Deploy qiling.

## 3. Frontend deploy (Vercel yoki Netlify)

### Vercel
1. GitHub repo'ni import qiling.
2. Root directory: `frontend`.
3. Framework: `Other` (static).
4. Deploy tugmasini bosing.
5. Frontendda API URL inputiga Render backend URL yozing.

### Netlify
1. New site from Git tanlang.
2. Base directory: `frontend`.
3. Build command bo'sh, publish directory: `frontend`.
4. Deploy qiling.

## 4. E2E tekshiruv

1. Frontend orqali credential issue qiling.
2. `GET /api/credentials` orqali yagona registryga tushganini tekshiring.
3. Verify form orqali `exists=true`, `valid=true` qaytishini tasdiqlang.
4. Talaba private key bilan access grant qiling, `GET /api/access/check` bilan tekshiring.

## Muhim eslatma

- Demo versiyada `studentPrivateKey` API ga yuboriladi (faqat test/development uchun).
- Production'da wallet signature (SIWE/EIP-712) + relayer bilan xavfsiz oqim ishlatish tavsiya etiladi.

## 5. Frontend deploy (GitHub Pages alternativ)

Repo ichidagi `.github/workflows/pages.yml` push bo'lganda `frontend/` papkani GitHub Pages'ga chiqaradi.

1. GitHub repo Settings -> Pages ga kiring.
2. Source sifatida `GitHub Actions` ni tanlang.
3. `master` ga push bo'lgach workflow ishga tushadi.
4. URL odatda: `https://micasajeager.github.io/7/`
