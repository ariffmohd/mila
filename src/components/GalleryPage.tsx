'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MediaFile } from '@/types/media';
import MediaUploadPanel from '@/components/MediaUploadPanel';

export default function GalleryPage() {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMedia = async () => {
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (!error && data) {
        setMedia(data as MediaFile[]);
      }
      setLoading(false);
    };

    loadMedia();
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_40%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-blue-950/30">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Public gallery</p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Conference highlights</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">Browse and download the latest moments shared during the event.</p>
            </div>
          </div>
        </header>

        <MediaUploadPanel />

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-10 text-center text-slate-400">Loading latest uploads...</div>
        ) : media.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-10 text-center text-slate-400">No media has been uploaded yet.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {media.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-lg shadow-slate-950/30">
                {item.file_type === 'video' ? (
                  <video controls preload="metadata" className="aspect-video w-full bg-slate-950 object-cover">
                    <source src={item.file_url} />
                  </video>
                ) : (
                  <img src={item.file_url} alt={item.filename} className="aspect-video w-full object-cover" />
                )}
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-300">{item.file_type}</span>
                    <span className="text-xs text-slate-400">{new Date(item.uploaded_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-300">{item.filename}</p>
                  <a href={item.file_url} target="_blank" rel="noreferrer" className="w-fit rounded-full border border-cyan-500/40 px-3 py-2 text-sm font-medium text-cyan-300 hover:border-cyan-400 hover:text-cyan-200">
                    Download
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
