'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { supabase, bucketName } from '@/lib/supabase';
import type { MediaFile } from '@/types/media';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState('');
  const [storageUsage, setStorageUsage] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const { data, error } = await supabase.from('media_files').select('*').order('uploaded_at', { ascending: false });
      if (!error && data) {
        setMedia(data as MediaFile[]);
      }

      const [photosResult, videosResult] = await Promise.all([
        supabase.storage.from(bucketName).list('photos', { limit: 100, offset: 0 }),
        supabase.storage.from(bucketName).list('videos', { limit: 100, offset: 0 }),
      ]);

      const storageEntries = [...(photosResult.data || []), ...(videosResult.data || [])];
      const totalBytes = storageEntries.reduce((sum, item) => sum + (item.metadata?.size || 0), 0);
      setStorageUsage(totalBytes);
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/upload` : 'https://example.com/upload';
    QRCode.toDataURL(url).then(setQrCode).catch(() => setQrCode(''));
  }, []);

  const login = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAdmin(true);
    } else {
      alert('Incorrect admin password');
    }
  };

  const deleteFile = async (id: string, filename: string) => {
    const confirmed = window.confirm(`Delete ${filename}?`);
    if (!confirmed) return;

    const fileToDelete = media.find((item) => item.id === id);
    if (!fileToDelete) return;

    const path = fileToDelete.file_url.split('/object/public/conference-media/').pop();
    const { error: storageError } = await supabase.storage.from(bucketName).remove([path || filename]);
    const { error: dbError } = await supabase.from('media_files').delete().eq('id', id);

    if (!storageError && !dbError) {
      setMedia((prev) => prev.filter((item) => item.id !== id));
    }
  };

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <h1 className="text-2xl font-semibold">Admin access</h1>
          <p className="mt-2 text-sm text-slate-400">Enter the secret password to manage media and view storage.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm outline-none focus:border-cyan-500"
            placeholder="Admin password"
          />
          <button onClick={login} className="mt-4 w-full rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950">Unlock dashboard</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Admin dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold">Manage uploaded media</h1>
            </div>
            <a href="/" className="rounded-full border border-slate-700 px-4 py-2 text-sm hover:border-cyan-400">Back to gallery</a>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/40">
            <h2 className="text-xl font-semibold">Storage overview</h2>
            <p className="mt-2 text-sm text-slate-400">Approximate storage used for the temporary event bucket.</p>
            <div className="mt-4 rounded-2xl bg-slate-800 p-4 text-sm text-slate-300">
              <div className="text-3xl font-semibold text-cyan-300">{(storageUsage / (1024 * 1024)).toFixed(1)} MB</div>
              <div className="mt-2">Estimated usage across conference uploads</div>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-800 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Upload link QR</h3>
              {qrCode ? <img src={qrCode} alt="Upload QR code" className="mt-3 w-full rounded-2xl bg-white p-3" /> : <div className="mt-3 text-sm text-slate-400">Generating QR code...</div>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/40">
            <h2 className="text-xl font-semibold">Uploaded files</h2>
            {loading ? (
              <div className="mt-4 text-sm text-slate-400">Loading files...</div>
            ) : media.length === 0 ? (
              <div className="mt-4 text-sm text-slate-400">No files available.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {media.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-100">{item.filename}</p>
                      <p className="text-sm text-slate-400">{item.file_type} • {new Date(item.uploaded_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => deleteFile(item.id, item.filename)} className="rounded-full border border-rose-500/40 px-3 py-2 text-sm text-rose-300 hover:border-rose-400">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
