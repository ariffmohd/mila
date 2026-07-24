'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MediaFile } from '@/types/media';
import MediaUploadPanel from '@/components/MediaUploadPanel';

export default function GalleryPage() {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'photos' | 'videos'>('all');
  const [selectedDate, setSelectedDate] = useState('');

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
    const uploadedDate = new Date(item.uploaded_at).toLocaleDateString('en-CA');

    if (selectedDate && uploadedDate !== selectedDate) {
      return false;
    }

    if (activeFilter === 'photos') return item.file_type === 'image';
    if (activeFilter === 'videos') return item.file_type === 'video';
    return true;
  });

  const filterButtons: Array<{ key: 'all' | 'photos' | 'videos'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'photos', label: 'Photos' },
    { key: 'videos', label: 'Videos' },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_55%)] bg-white px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.22)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-900">2026 MALAYSIA-CHINA ACADEMIC CONFERENCE ON ARTIFICIAL INTELLIGENCE IN EDUCATION</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">GALLERY</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">Browse and download the latest moments shared during the event.</p>
            </div>
          </div>
        </header>

        <MediaUploadPanel onUploadComplete={loadMedia} />

        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            {filterButtons.map((filter) => {
              const isActive = activeFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${isActive
                    ? 'border-black bg-black text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <span className="text-sm text-slate-600">
            <span className="font-semibold">Selected Date:</span>{' '}
            {selectedDate
              ? new Date(selectedDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
              : 'All'}
          </span>

          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Filter by Date</span>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('date-picker') as HTMLInputElement;
                    input?.showPicker?.();
                    input?.focus();
                  }}
                  className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 hover:border-slate-300"
                >
                  📅 Select Date
                </button>

                <input
                  id="date-picker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="absolute opacity-0 pointer-events-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Clear
              </button>
            </div>
            {/* <span className="text-xs text-slate-500">{selectedDate ? `showing uploads for ${selectedDate}` : 'showing all dates'}</span> */}
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
            loading latest uploads...
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
            No {activeFilter === 'all' ? 'media' : activeFilter} has been uploaded yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredMedia.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_44px_-24px_rgba(15,23,42,0.24)]">
                {item.file_type === 'video' ? (
                  <video controls preload="metadata" className="aspect-video w-full bg-slate-950 object-cover">
                    <source src={item.file_url} />
                  </video>
                ) : (
                  <img src={item.file_url} alt={item.filename} className="aspect-video w-full object-cover" />
                )}
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-600">{item.file_type}</span>
                    <span className="text-right text-xs text-slate-500">{new Date(item.uploaded_at).toLocaleString()}</span>
                  </div>
                  {/* <p className="text-sm text-slate-700">{item.filename}</p> */}
                  <a
                    href={`${item.file_url}?download=${encodeURIComponent(item.filename)}`}
                    className="w-fit rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
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
