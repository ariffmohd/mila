'use client';

import { useState, type FormEvent } from 'react';
import { supabase, bucketName, allowedTypes, maxFileSize, isSupabaseConfigured, supabaseConfigError } from '@/lib/supabase';

type MediaUploadPanelProps = {
  onUploadComplete?: () => void;
};

export default function MediaUploadPanel({ onUploadComplete }: MediaUploadPanelProps) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpload = async (e: FormEvent) => {
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
      onUploadComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
      <h2 className="text-2xl font-semibold text-slate-900">Upload Media</h2>
      <p className="mt-2 text-sm text-slate-600">Select multiple photos and videos from your device. Files are public once uploaded.</p>

      <form onSubmit={handleUpload}>
        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center transition hover:border-slate-400 hover:bg-slate-100">
          <span className="text-lg font-medium text-slate-800">TAP TO CHOOSE FILES</span>
          <span className="mt-2 text-sm text-slate-500">Supported: JPG, PNG, MP4, MOV • Max 500MB per file</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,video/mp4,video/quicktime"
            onChange={(e) => setFiles(e.target.files)}
            className="hidden"
          />
        </label>

        <div className="mt-4 min-h-6 text-sm text-slate-500">
          {files && files.length > 0 ? `${files.length} file(s) selected` : 'No files selected yet.'}
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="mt-6 w-full rounded-2xl bg-black px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {uploading ? 'uploading...' : 'Upload Files'}
        </button>

        {message && <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </form>
    </section>
  );
}
