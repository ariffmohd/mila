'use client';

import { useState } from 'react';
import { supabase, bucketName, allowedTypes, maxFileSize, isSupabaseConfigured, supabaseConfigError } from '@/lib/supabase';

export default function UploadPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError(supabaseConfigError);
      return;
    }

    if (!files || files.length === 0) {
      setError('Please select at least one file.');
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');

    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png'].includes(ext || '');
        const isVideo = ['mp4', 'mov'].includes(ext || '');
        const mimeType = file.type || (isImage ? 'image/jpeg' : isVideo ? 'video/mp4' : '');

        if (!isImage && !isVideo) {
          throw new Error(`Unsupported file type: ${file.name}`);
        }

        if (mimeType && !allowedTypes.includes(mimeType)) {
          throw new Error(`Unsupported file type: ${file.name}`);
        }

        if (file.size > maxFileSize) {
          throw new Error(`File exceeds 500MB limit: ${file.name}`);
        }

        const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
        const folder = isVideo ? 'videos' : 'photos';
        const { error: uploadError } = await supabase.storage.from(bucketName).upload(`${folder}/${safeName}`, file, {
          cacheControl: '3600',
          upsert: false,
        });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(`${folder}/${safeName}`);
        const publicUrl = publicUrlData.publicUrl;

        const { error: dbError } = await supabase.from('media_files').insert({
          filename: file.name,
          file_url: publicUrl,
          file_type: isVideo ? 'video' : 'image',
          uploaded_at: new Date().toISOString(),
        });

        if (dbError) throw dbError;
      }

      setMessage('Files uploaded successfully.');
      setFiles(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/30">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Temporary media sharing</p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">AI Conference Media Hub</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
                Upload conference photos and videos instantly for attendees and speakers to browse from their phones.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm">
              <a href="/" className="rounded-full border border-slate-700 px-4 py-2 hover:border-cyan-400">Gallery</a>
              <a href="/admin" className="rounded-full border border-slate-700 px-4 py-2 hover:border-cyan-400">Admin</a>
            </nav>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleUpload} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/40">
            <h2 className="text-2xl font-semibold">Upload media</h2>
            <p className="mt-2 text-sm text-slate-400">Select multiple photos and videos from your device. Files are public once uploaded.</p>

            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-500/50 bg-slate-800/70 px-6 py-10 text-center transition hover:border-cyan-400">
              <span className="text-lg font-medium">Tap to choose files</span>
              <span className="mt-2 text-sm text-slate-400">Supported: JPG, PNG, MP4, MOV • Max 500MB per file</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,video/mp4,video/quicktime"
                onChange={(e) => setFiles(e.target.files)}
                className="hidden"
              />
            </label>

            <div className="mt-4 min-h-6 text-sm text-slate-400">
              {files && files.length > 0 ? `${files.length} file(s) selected` : 'No files selected yet.'}
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="mt-6 w-full rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {uploading ? 'Uploading...' : 'Upload files'}
            </button>

            {message && <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}
            {error && <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
          </form>

          <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/40">
            <h3 className="text-xl font-semibold">Quick info</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>• No account required for upload or browsing</li>
              <li>• Public link access for visitors and speakers</li>
              <li>• Optimized for phone gallery selection and QR codes</li>
              <li>• Files appear instantly in the public gallery</li>
            </ul>
          </aside>
        </section>
      </div>
    </main>
  );
}
