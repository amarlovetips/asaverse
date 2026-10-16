# AsaVerse

AsaVerse is a Next.js application with a Supabase-backed admin studio and game world.

## Local development

Install dependencies and start the local server:

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key before using features that connect to Supabase. The home page and production build do not require a live Supabase connection.

## Validation

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Deploying to Vercel

Vercel detects this Next.js application automatically. Use the standard `npm run build` build command and leave the output directory at its default; Next.js server features are used, so this is not a static export. Configure these environment variables in the Vercel project for each environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Only the Supabase publishable key belongs in browser-accessible configuration. Never add a service-role key or other secret to `NEXT_PUBLIC_*` variables or commit local environment files. Admin authentication, database access, and player services require the configured Supabase project and cannot be fully verified by a local production build.
