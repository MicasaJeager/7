# EduChain Diploma Verifier

Blockchain asosida diplom/sertifikat verifikatsiyasi uchun ta'lim tizimi.

## Asosiy imkoniyatlar

- Talaba uchun diplom, sertifikat va online kurs natijalarini blockchain'da yaratish.
- Diplom/sertifikat haqiqiyligini metadata hash orqali tekshirish.
- Talaba ma'lumotlarini IPFS (mavjud bo'lsa) yoki local content-addressed storage (CAS) da saqlash.
- Online kurs natijalarini alohida `course-result` credential sifatida chain'ga yozish.
- Talabaning credential ko'rish ruxsatini boshqa universitet/ish beruvchiga berishi.
- Barcha credentiallarni bitta registry API va frontend jadvalida ro'yxatdan o'tkazish.

## Loyiha tuzilmasi

- `contracts/` - Solidity smart contract va Hardhat deploy/test fayllari
- `backend/` - Express API (issue, verify, share, unified registry)
- `frontend/` - statik web panel
- `requirements/` - siz so'ragan har bir topshiriq gapi alohida fayl ko'rinishida
- `docs/` - deploy hujjatlari

## 1) Smart contractni ishga tushirish

```bash
cd contracts
npm install
cp .env.example .env
# .env ga AMOY_RPC_URL va ISSUER_PRIVATE_KEY yozing
npm run deploy:amoy
```

Deploy natijasida chiqqan contract address'ni backend `.env` ga yozing.

## 2) Backendni ishga tushirish

```bash
cd backend
npm install
cp .env.example .env
# .env ichida RPC_URL, CONTRACT_ADDRESS, ISSUER_PRIVATE_KEY ni to'ldiring
npm run start
```

Backend: `http://localhost:4000/api/health`

## 3) Frontendni ishga tushirish

Frontend statik, shuning uchun oddiy static server yetarli.

```bash
cd frontend
# misol: python bo'lsa
python -m http.server 8080
```

Brauzerda oching: `http://localhost:8080`

## API qisqacha

- `POST /api/credentials/issue` - diplom/sertifikat yaratish
- `POST /api/courses/result` - online kurs natijasini yozish
- `POST /api/credentials/verify` - verifikatsiya
- `GET /api/credentials` - yagona registry
- `POST /api/access/grant` - talaba access berishi
- `GET /api/access/check` - access holati

To'liq deploy yo'riqnomasi: `docs/DEPLOY_FREE_SERVERS.md`

## GitHub Pages (Frontend)

Repo ichida GitHub Pages workflow tayyor (`.github/workflows/pages.yml`).
GitHub'da `Settings -> Pages -> Source: GitHub Actions` yoqilsa, `frontend/` avtomatik deploy bo'ladi.
