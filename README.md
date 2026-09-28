# Payment Voucher App

A deployment-ready personal payment voucher management app built with **Next.js + Neon PostgreSQL + Vercel + PWA**, with no Prisma.

## Included

- Username + 4-digit PIN login
- HTTP-only signed session cookie
- Neon PostgreSQL integration
- Create voucher
- Automatic Indian amount-to-words conversion
- Mandatory validation for Date, Paid To, Amount, Type of Payee, Mode of Payment and Towards
- Optional PAN and TDS
- Voucher register with search and filters
- Individual PDF download
- Bulk PDF download
- Date-range PDF download
- Landscape voucher PDF matching the supplied voucher structure
- Unicode Rupee symbol support using embedded DejaVu Sans fonts
- Luxury corporate web UI: midnight navy, champagne gold and ivory
- Responsive mobile UI
- PWA manifest, icons and service worker

## Requirements

- Node.js 20.9+
- A Neon PostgreSQL database
- Vercel account for deployment

## 1. Install

```bash
npm install
```

## 2. Environment variables

Create `.env.local`:

```env
DATABASE_URL="your-neon-connection-string"
SESSION_SECRET="a-long-random-secret"
```

Do not commit `.env.local`.

## 3. Database

The database schema is in:

`scripts/schema.sql`

Run it once in the Neon SQL editor if the database has not already been created.

## 4. Create the first user

```bash
npm run create-user
```

The script asks for:

- username
- name
- 4-digit PIN

The PIN is stored as a bcrypt hash.

## 5. Run locally

```bash
npm run dev
```

Open:

`http://localhost:3000`

Optional database test:

`http://localhost:3000/api/test-db`

## 6. Production build

```bash
npm run build
npm start
```

## 7. Deploy to Vercel

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Add these environment variables in Vercel:
   - `DATABASE_URL`
   - `SESSION_SECRET`
4. Deploy.
5. Run the production URL and log in.

No Prisma migration or Prisma client is required.

## PWA

The app includes:

- `/manifest.webmanifest` via Next.js metadata routes
- `/sw.js`
- 192x192 and 512x512 app icons
- standalone display mode

On Android/Chrome, use the browser's **Install app / Add to home screen** option after deployment. On iPhone, use Safari's **Add to Home Screen**.

## PDF fonts

`public/fonts/DejaVuSans.ttf` and `public/fonts/DejaVuSans-Bold.ttf` are bundled so PDF generation supports `₹` and bold field values without depending on an external font download at runtime.

## Important production notes

- Never expose `DATABASE_URL` or `SESSION_SECRET` to client-side code.
- Keep `.env.local` out of Git.
- The app intentionally keeps authentication simple for personal use: hashed 4-digit PIN + HTTP-only signed session cookie.
- The generated PDF remains a formal black/white voucher and is intentionally **not** styled with the web application's luxury theme.
