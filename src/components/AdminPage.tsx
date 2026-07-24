'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import JSZip from 'jszip'; // Make sure jszip is installed!
import { supabase, bucketName } from '@/lib/supabase';
import type { MediaFile } from '@/types/media';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [storageUsage, setStorageUsage] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'photos' | 'videos'>('all');
  const [selectedDate, setSelectedDate] = useState('');

  const filteredMedia = media.filter((item) => {
    const uploadedDate = new Date(item.uploaded_at).toLocaleDateString('en-CA');
    if (selectedDate && uploadedDate !== selectedDate) return false;
    if (activeFilter === 'photos') return item.file_type === 'image';
    if (activeFilter === 'videos') return item.file_type === 'video';
    return true;
  });

  const downloadZip = async () => {
    const selectedMedia = filteredMedia.filter(item =>
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
      link.download = 'conference-media.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating zip:', error);
      alert('An error occurred while creating the ZIP file. Check the console for details.');
    } finally {
      setIsDownloading(false);
    }
  };

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

  const toggleSelect = (id: string) => {
    setSelectedFiles((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    const confirmed = window.confirm(
      `Delete ${selectedFiles.length} selected files?`
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

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
        <div className="w-full max-w-sm">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm outline-none focus:border-cyan-500"
            placeholder="Password"
          />
          <button onClick={login} className="mt-4 w-full rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950">Login</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/40">
            <div className="mb-4 flex flex-col gap-4 rounded-[28px] border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'photos', label: 'Photos' },
                  { key: 'videos', label: 'Videos' }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key as 'all' | 'photos' | 'videos')}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${activeFilter === filter.key
                      ? 'border-cyan-400 bg-cyan-400 text-slate-950 shadow-sm'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                      }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <span className="text-sm text-slate-400">
                <span className="font-semibold text-slate-100">Selected Date:</span>{' '}
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'All'}
              </span>

              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="font-semibold text-slate-100">Filter by Date</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('admin-date-picker') as HTMLInputElement;
                      input?.showPicker?.();
                      input?.focus();
                    }}
                    className="flex h-10 items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 text-sm text-slate-300 hover:border-cyan-400"
                  >
                    📅 Select Date
                  </button>
                  <input
                    id="admin-date-picker"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="absolute pointer-events-none opacity-0"
                  />
                </div>
                <button
                  onClick={() => setSelectedDate('')}
                  className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400 font-semibold"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* UPDATED ALIGNMENT BLOCK: All on the same level */}
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              {/* LEFT SIDE: Select All & Cancel */}
              <div className="flex items-center gap-4 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      filteredMedia.length > 0 &&
                      filteredMedia.every(item => selectedFiles.includes(item.id))
                    }
                    onChange={() => {
                      const allSelected = filteredMedia.every(item => selectedFiles.includes(item.id));
                      if (allSelected) {
                        setSelectedFiles(prev => prev.filter(id => !filteredMedia.some(item => item.id === id)));
                      } else {
                        setSelectedFiles(prev => [
                          ...prev,
                          ...filteredMedia.filter(item => !prev.includes(item.id)).map(item => item.id)
                        ]);
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span>Select All</span>
                </div>

                {selectedFiles.length > 0 && (
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-sm font-medium text-rose-500 transition hover:text-rose-400"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* RIGHT SIDE: Disclaimer & Buttons */}
              <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">

                {/* The Disclaimer (now inline to the left of the buttons) */}
                {selectedFiles.length > 0 && (
                  <p className="max-w-[280px] text-right text-[11px] leading-tight text-slate-400">
                    * Download in small batches<br />(max 15 videos or 100 photos) to avoid browser crashes.
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadZip}
                    disabled={selectedFiles.length === 0 || isDownloading}
                    className="whitespace-nowrap rounded-full border border-cyan-500/40 px-4 py-2 text-sm text-cyan-300 hover:border-cyan-400 disabled:opacity-40"
                  >
                    {isDownloading ? 'Zipping...' : `Download ZIP (${selectedFiles.length})`}
                  </button>

                  <button
                    onClick={deleteSelected}
                    disabled={selectedFiles.length === 0 || isDownloading}
                    className="whitespace-nowrap rounded-full border border-rose-500/40 px-4 py-2 text-sm text-rose-300 transition hover:border-rose-400 hover:bg-rose-500/10 disabled:opacity-40"
                  >
                    Delete ({selectedFiles.length})
                  </button>
                </div>

              </div>
            </div>

            {loading ? (
              <div className="mt-4 text-sm text-slate-400">Loading files...</div>
            ) : media.length === 0 ? (
              <div className="mt-4 text-sm text-slate-400">No files available.</div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    className={`relative overflow-hidden rounded-2xl border ${selectedFiles.includes(item.id) ? 'border-cyan-400' : 'border-slate-800'
                      } bg-slate-950/70`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="absolute left-3 top-3 z-10 h-5 w-5"
                    />
                    <div className="group relative">
                      {item.file_type === 'video' ? (
                        <video className="aspect-square w-full rounded-t-2xl bg-black object-contain">
                          <source src={item.file_url} />
                        </video>
                      ) : (
                        <img
                          src={item.file_url}
                          alt={item.filename}
                          className="aspect-square w-full rounded-t-2xl object-cover"
                        />
                      )}
                      <div
                        onClick={() => setPreviewMedia(item)}
                        className="absolute inset-0 cursor-zoom-in bg-black/0 transition-all duration-200 group-hover:bg-black/30"
                      />
                    </div>
                    <div className="flex flex-col gap-2 p-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-300">
                          {item.file_type}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.uploaded_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
        >
          <button
            onClick={() => setPreviewMedia(null)}
            className="absolute right-6 top-6 z-50 rounded-full bg-black/60 px-4 py-2 text-2xl text-white hover:bg-black/80"
          >
            ✕
          </button>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw]">
            {previewMedia.file_type === 'video' ? (
              <video controls autoPlay className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl">
                <source src={previewMedia.file_url} />
              </video>
            ) : (
              <img
                src={previewMedia.file_url}
                alt={previewMedia.filename}
                className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain"
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}