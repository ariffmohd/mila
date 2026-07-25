'use client';

import { useEffect, useState } from 'react';
import { supabase, bucketName } from '@/lib/supabase'; 
import type { MediaFile } from '@/types/media';
import MediaUploadPanel from '@/components/MediaUploadPanel';
import JSZip from 'jszip'; 

export default function GalleryPage() {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false); 
  const [activeFilter, setActiveFilter] = useState<'all' | 'photos' | 'videos'>('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
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

  const toggleSelect = (id: string) => {
    setSelectedFiles((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  // Helper to force direct download for a single file without opening a new tab
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
      link.download = 'gallery-media.zip';
      
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_55%)] bg-white px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        
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
                className={`text-sm font-medium text-rose-500 transition hover:text-rose-600 ${
                  selectedFiles.length > 0 ? 'opacity-100' : 'pointer-events-none opacity-0'
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
            </div>
          </div>

          <div className="mt-2 min-h-[20px]">
            {selectedFiles.length > 0 && (
              <p className="text-[11px] text-slate-400 sm:text-[12px] sm:text-right">
                * Pro Tip: Download in small batches (max 15 videos or 100 photos) to avoid browser crashes.
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
                className={`relative flex flex-col overflow-hidden rounded-2xl border transition-all ${
                  selectedFiles.includes(item.id)
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
                  
                  {/* Replaced Timestamp with Direct Download Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSingleFile(item.file_url, item.filename);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200/60 text-slate-600 transition hover:bg-slate-300 hover:text-slate-900"
                    title="Download file"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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