# AI Conference Media Hub

A temporary, public-facing photo and video sharing platform for conference events. Committee members can upload media without accounts, visitors can browse and download it, and admins can manage files with a password-protected dashboard.

## Features
- Public upload page at /upload
- Public gallery at /
- Password-protected admin dashboard at /admin
- Supabase Storage-backed uploads
- Responsive mobile-first interface
- QR code for the upload URL

## Tech stack
- Next.js 14 + TypeScript
- Tailwind CSS
- Supabase Storage + Supabase JS client
- QR code generation

## Local setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment example file:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in your Supabase values and admin password.
4. Start the app:
   ```bash
   npm run dev
   ```
5. Visit http://localhost:3000

## Supabase configuration
1. Create a Supabase project.
2. In Storage, create a public bucket named conference-media.
3. Inside the bucket, create folders named photos and videos.
4. Create a table named media_files with the following columns:
   - id: uuid, primary key, default gen_random_uuid()
   - filename: text
   - file_url: text
   - file_type: text
   - uploaded_at: timestamptz, default now()
5. Make the bucket public so uploaded files are directly viewable/downloadable.
6. Ensure your anon key and project URL are available in .env.local.

## Vercel deployment
1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Add the environment variables from .env.example in Vercel.
4. Deploy.
5. Set the project root to the repository root.

## Notes
- The app is intended for short-lived use during a 2-day conference.
- The admin password is only used for the simple dashboard protection.
- For production, consider adding stricter storage policies and a real admin auth flow.
