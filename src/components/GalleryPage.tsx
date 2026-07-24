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
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);

  const downloadZip = async () => {
    const selectedMedia = filteredMedia.filter((item) =>
      selectedFiles.includes(item.id)
    );

    const response = await fetch('/api/download-zip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: selectedMedia.map((item) => ({
          url: item.file_url,
          filename: item.filename,
        })),
      }),
    });

    if (!response.ok) {
      alert('Failed to create ZIP');
      return;
    }

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'conference-media.zip';

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  };

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

  const downloadSelected = async () => {
    const selectedMedia = filteredMedia.filter((item) =>
      selectedFiles.includes(item.id)
    );

    for (const item of selectedMedia) {
      try {
        const response = await fetch(item.file_url);
        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // small delay so browser does not block multiple downloads
        await new Promise((resolve) => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`Failed downloading ${item.filename}`, error);
      }
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_55%)] bg-white px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.22)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-900">2026 MALAYSIA-CHINA ACADEMIC CONFERENCE ON ARTIFICIAL INTELLIGENCE IN EDUCATION</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">GALLERY</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">Browse and download the latest moments shared during the event.</p>
            </div>
          </div>
        </header> */}

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

        <div className="mb-3 flex items-center justify-between text-sm text-slate-600">

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

            {/* NEW: Cancel Button - only shows when files are selected */}
            {selectedFiles.length > 0 && (
              <button
                onClick={() => setSelectedFiles([])}
                className="text-sm font-medium text-rose-500 transition hover:text-rose-600"
              >
                Cancel
              </button>
            )}

          </div>


          <button
            onClick={downloadSelected}
            disabled={selectedFiles.length === 0}
            className="
    rounded-full
    border
    border-slate-300
    px-4
    py-2
    text-sm
    font-medium
    disabled:opacity-40
    hover:bg-slate-50
    "
          >
            Download ({selectedFiles.length})
          </button>


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
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {filteredMedia.map((item) => (

              <div
                key={item.id}
                className={`relative overflow-hidden rounded-2xl border ${selectedFiles.includes(item.id)
                  ? 'border-cyan-400'
                  : 'border-slate-200'
                  } bg-white shadow-sm`}
              >

                <input
                  type="checkbox"
                  checked={selectedFiles.includes(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="absolute left-3 top-3 z-20 h-5 w-5"
                />


                <div className="group relative">

                  {item.file_type === 'video' ? (

                    <video
                      className="aspect-square w-full bg-black object-contain"
                    >
                      <source src={item.file_url} />
                    </video>

                  ) : (

                    <img
                      src={item.file_url}
                      alt={item.filename}
                      className="aspect-square w-full object-cover"
                    />

                  )}


                  {/* hover zoom area */}
                  <div
                    onClick={() => setPreviewMedia(item)}
                    className="
 absolute inset-0
 cursor-zoom-in
 bg-black/0
 transition
 group-hover:bg-black/30
 "
                  >
                  </div>


                </div>


                <div className="flex flex-col gap-2 p-2">


                  <div className="flex items-center justify-between">

                    <span
                      className="
rounded-full
bg-slate-100
px-2
py-1
text-[10px]
uppercase
tracking-wider
text-slate-600
"
                    >
                      {item.file_type}
                    </span>


                    <span className="text-[10px] text-slate-500">
                      {new Date(item.uploaded_at).toLocaleString()}
                    </span>


                  </div>


                  {/* <a
                    href={`${item.file_url}?download=${encodeURIComponent(item.filename)}`}
                    className="
block
w-full
rounded-full
border
border-slate-300
px-2
py-1
text-center
text-xs
text-slate-700
hover:bg-slate-50
"
                  >
                    Download
                  </a> */}


                </div>


              </div>

            ))}
          </div>
        )}
      </div>

      {previewMedia && (

        <div
          onClick={() => setPreviewMedia(null)}
          className="
fixed inset-0
z-50
flex
items-center
justify-center
bg-black/80
p-6
"
        >


          <button
            onClick={() => setPreviewMedia(null)}
            className="
absolute
right-6
top-6
rounded-full
bg-black/60
px-4
py-2
text-2xl
text-white
"
          >
            ✕
          </button>



          <div
            onClick={(e) => e.stopPropagation()}
          >

            {previewMedia.file_type === 'video' ? (

              <video
                controls
                autoPlay
                className="
max-h-[90vh]
max-w-[90vw]
rounded-xl
object-contain
"
              >
                <source src={previewMedia.file_url} />
              </video>


            ) : (

              <img
                src={previewMedia.file_url}
                className="
max-h-[90vh]
max-w-[90vw]
rounded-xl
object-contain
"
              />

            )}

          </div>


        </div>

      )}

    </main>
  );
}
