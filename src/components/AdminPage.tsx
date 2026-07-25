'use client';

import { useEffect, useState } from 'react';
import { supabase, bucketName } from '@/lib/supabase';
import type { MediaFile } from '@/types/media';
import JSZip from 'jszip';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'photos' | 'videos'>('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);

  const loadMedia = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_files')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (!error && data) {
      setMedia(data as MediaFile[]);
    }
    setLoading(false);
  };

  // Only load media after successful login
  useEffect(() => {
    if (isAdmin) {
      loadMedia();
    }
  }, [isAdmin]);

  const login = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAdmin(true);
    } else {
      alert('Incorrect Password!');
    }
  };

  const filteredMedia = media.filter((item) => {
    const uploadedDate = new Date(item.uploaded_at).toLocaleDateString('en-CA');
    if (selectedDate && uploadedDate !== selectedDate) return false;
    if (activeFilter === 'photos') return item.file_type === 'image';
    if (activeFilter === 'videos') return item.file_type === 'video';
    return true;
  });

  const filterButtons: Array<{ key: 'all' | 'photos' | 'videos'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'photos', label: 'Photos' },
    { key: 'videos', label: 'Videos' },
  ];

  const toggleSelect = (id: string) => {
    setSelectedFiles((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const downloadSelected = async () => {
    const selectedMedia = filteredMedia.filter((item) =>
      selectedFiles.includes(item.id)
    );

    if (selectedMedia.length === 0) return;

    try {
      setIsDownloading(true);
      const zip = new JSZip();

      for (const item of selectedMedia) {
        const response = await fetch(item.file_url);
        if (!response.ok) throw new Error(`Failed to fetch ${item.filename}`);
        const blob = await response.blob();
        zip.file(item.filename, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'admin-conference-media.zip';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating zip:', error);
      alert('An error occurred while creating the ZIP file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const deleteSelected = async () => {
    const confirmed = window.confirm(
      `Delete ${selectedFiles.length} selected files forever?`
    );

    if (!confirmed) return;

    const selectedMedia = media.filter((item) =>
      selectedFiles.includes(item.id)
    );

    for (const item of selectedMedia) {
      const path = item.file_url
        .split('/object/public/conference-media/')
        .pop();

      await supabase.storage
        .from(bucketName)
        .remove([path || item.filename]);

      await supabase
        .from('media_files')
        .delete()
        .eq('id', item.id);
    }

    setMedia((prev) =>
      prev.filter((item) => !selectedFiles.includes(item.id))
    );

    setSelectedFiles([]);
  };

  // 1. The Secure Login Screen - Now perfectly matches the Light Theme!
  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_55%)] bg-white px-4 py-10 text-slate-800">
        <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
          />
          <button onClick={login} className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800">
            Login
          </button>
        </div>
      </main>
    );
  }

  // 2. The Main Admin UI
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_55%)] bg-white px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">

        {/* The Official Event Header - Tailored for Admin */}
        <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-900">
                2026 MALAYSIA-CHINA ACADEMIC CONFERENCE ON ARTIFICIAL INTELLIGENCE IN EDUCATION
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
                GALLERY (ADMIN)
              </h1>
            </div>
          </div>
        </header>

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
          </div>
        </div>

        {/* Download Actions Area */}
        <div className="mb-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-600">

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    filteredMedia.length > 0 &&
                    selectedFiles.length === filteredMedia.length
                  }
                  onChange={() => {
                    if (selectedFiles.length === filteredMedia.length) {
                      setSelectedFiles([]);
                    } else {
                      setSelectedFiles(filteredMedia.map(item => item.id));
                    }
                  }}
                  className="h-4 w-4"
                />
                <span>Select All</span>
              </div>

              <button
                onClick={() => setSelectedFiles([])}
                className={`text-sm font-medium text-rose-500 transition hover:text-rose-600 ${selectedFiles.length > 0 ? 'opacity-100' : 'pointer-events-none opacity-0'
                  }`}
              >
                Cancel
              </button>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={downloadSelected}
                disabled={selectedFiles.length === 0 || isDownloading}
                className="tabular-nums whitespace-nowrap rounded-full border border-slate-300 px-4 py-2 text-sm font-medium transition disabled:opacity-40 hover:bg-slate-50"
              >
                {isDownloading ? 'Zipping...' : `Download ZIP (${selectedFiles.length})`}
              </button>

              <button
                onClick={deleteSelected}
                disabled={selectedFiles.length === 0 || isDownloading}
                className="tabular-nums whitespace-nowrap rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition disabled:opacity-40 hover:border-rose-300 hover:bg-rose-50"
              >
                Delete ({selectedFiles.length})
              </button>
            </div>
          </div>

          {/* Seamless Disclaimer */}
          <div className="mt-2 min-h-[20px]">
            {selectedFiles.length > 0 && (
              <p className="text-[11px] text-slate-400 sm:text-[12px] sm:text-right">
                * Pro tip: Download in small batches (max 15 videos or 100 photos) to prevent browser freezing.
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
            loading latest uploads...
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
            No {activeFilter === 'all' ? 'files' : activeFilter} have been uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                className={`relative flex flex-col overflow-hidden rounded-2xl border transition-all ${selectedFiles.includes(item.id)
                    ? 'border-cyan-400 ring-1 ring-cyan-400'
                    : 'border-slate-200'
                  } bg-white shadow-sm`}
              >
                <div className="group relative bg-slate-100">
                  {item.file_type === 'video' ? (
                    <video className="aspect-square w-full object-contain">
                      <source src={item.file_url} />
                    </video>
                  ) : (
                    <img
                      src={item.file_url}
                      alt={item.filename}
                      className="aspect-square w-full object-cover"
                    />
                  )}

                  <div
                    onClick={() => setPreviewMedia(item)}
                    className="absolute inset-0 cursor-zoom-in bg-black/0 transition group-hover:bg-black/30"
                  ></div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-2.5">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-cyan-500"
                    />
                    <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-700">
                      {item.file_type}
                    </span>
                  </label>

                  <span className="max-w-[70px] text-right text-[9px] leading-tight text-slate-500 sm:max-w-none">
                    {new Date(item.uploaded_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
        >
          <button
            onClick={() => setPreviewMedia(null)}
            className="absolute right-6 top-6 z-50 rounded-full bg-black/60 px-4 py-2 text-2xl text-white"
          >
            ✕
          </button>

          <div onClick={(e) => e.stopPropagation()}>
            {previewMedia.file_type === 'video' ? (
              <video
                controls
                autoPlay
                className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
              >
                <source src={previewMedia.file_url} />
              </video>
            ) : (
              <img
                src={previewMedia.file_url}
                className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}