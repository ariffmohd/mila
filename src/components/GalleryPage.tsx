'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; 
import type { MediaFile } from '@/types/media';
import MediaUploadPanel from '@/components/MediaUploadPanel';

export default function GalleryPage() {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);

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

  useEffect(() => {
    loadMedia();
  }, []);

  const filteredMedia = media.filter((item) => {
    if (item.file_type === 'video') return false;
    const uploadedDate = new Date(item.uploaded_at).toLocaleDateString('en-CA');
    if (selectedDate && uploadedDate !== selectedDate) return false;
    return true;
  });

  const downloadSingleFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file.');
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_55%)] bg-white px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        
        <MediaUploadPanel onUploadComplete={loadMedia} />

        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)] sm:flex-row sm:items-center sm:justify-between">
          <span className="px-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Viewing:</span>{' '}
            {selectedDate
              ? new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'All Photos'}
          </span>

          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden font-medium text-slate-700 sm:inline">Filter by Date</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('date-picker') as HTMLInputElement;
                    input?.showPicker?.();
                    input?.focus();
                  }}
                  className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  📅 Select Date
                </button>
                <input
                  id="date-picker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pointer-events-none absolute opacity-0"
                />
              </div>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
            loading...
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
            No photos uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all"
              >
                <div className="group relative bg-slate-100">
                  <img
                    src={item.file_url}
                    alt={item.filename}
                    className="aspect-square w-full object-cover"
                  />
                  <div
                    onClick={() => setPreviewMedia(item)}
                    className="absolute inset-0 cursor-zoom-in bg-black/0 transition group-hover:bg-black/30"
                  ></div>
                </div>

                {/* Left-aligned download button */}
                <div className="flex items-center justify-start border-t border-slate-100 bg-slate-50 p-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSingleFile(item.file_url, item.filename);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/60 text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-600 hover:ring-1 hover:ring-cyan-200"
                    title="Download photo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
        >
          <button
            onClick={() => setPreviewMedia(null)}
            className="absolute right-6 top-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20"
          >
            ✕
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <img
              src={previewMedia.file_url}
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </main>
  );
}