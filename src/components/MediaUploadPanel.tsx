'use client';

import { useState, useEffect } from 'react';
import { supabase, bucketName, allowedTypes, maxFileSize, isSupabaseConfigured, supabaseConfigError } from '@/lib/supabase';

type MediaUploadPanelProps = {
    onUploadComplete?: () => void;
};

export default function MediaUploadPanel({ onUploadComplete }: MediaUploadPanelProps) {
    const [files, setFiles] = useState<FileList | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!message && !error) return;

        const clearMessages = () => {
            setMessage('');
            setError('');
        };

        const timer = setTimeout(() => {
            window.addEventListener('click', clearMessages);
        }, 10);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('click', clearMessages);
        };
    }, [message, error]);

    const handleUpload = async (filesToUpload: FileList) => {
        setError('');
        setMessage('');

        if (!isSupabaseConfigured) {
            setError(supabaseConfigError);
            return;
        }

        setUploading(true);
        setProgress(0);

        // Start a smooth simulated progress to keep the UI feeling alive
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                // Moves fast at first, then slows down as it approaches 99%
                if (prev < 60) return prev + Math.floor(Math.random() * 10) + 5;
                if (prev < 90) return prev + Math.floor(Math.random() * 5) + 2;
                if (prev < 99) return prev + 1;
                return prev;
            });
        }, 400); // Ticks every 400ms

        try {
            for (const file of Array.from(filesToUpload)) {
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

            // Server confirmed upload! Stop the fake progress and snap to 100%
            clearInterval(progressInterval);
            setProgress(100);

            setMessage('Files uploaded successfully.');
            setFiles(null);
            onUploadComplete?.();
        } catch (err) {
            clearInterval(progressInterval); // Stop ticking if there's an error
            setError(err instanceof Error ? err.message : 'Upload failed.');
        } finally {
            setUploading(false);
            // Hide the 100% text after a brief moment
            setTimeout(() => setProgress(0), 1000);
        }
    };

    return (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-900">2026 MALAYSIA-CHINA ACADEMIC CONFERENCE ON ARTIFICIAL INTELLIGENCE IN EDUCATION</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">GALLERY</h1>
            <p className="mt-2 text-sm text-slate-600">Select multiple photos and videos from your device. Files are public once uploaded.</p>

            <div className="mt-6">
                <label
                    className={`flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition ${uploading
                        ? 'border-slate-200 bg-slate-50 opacity-70 cursor-wait'
                        : 'border-slate-300 bg-slate-50/80 cursor-pointer hover:border-slate-400 hover:bg-slate-100'
                        }`}
                >
                    <span className={`text-lg font-medium ${uploading ? 'text-cyan-600 text-2xl' : 'text-slate-800'}`}>
                        {uploading ? `${progress}%` : 'Upload Files'}
                    </span>

                    {/* The sub-text now stays visible at all times */}
                    <span className="mt-2 text-sm text-slate-500">Supported Formats: JPG, PNG, MP4, MOV<br />Max File Size: 500MB per file</span>

                    <input
                        type="file"
                        multiple
                        disabled={uploading}
                        accept="image/jpeg,image/png,video/mp4,video/quicktime"
                        onClick={(e) => {
                            (e.target as HTMLInputElement).value = '';
                        }}
                        onChange={(e) => {
                            const selectedFiles = e.target.files;
                            if (selectedFiles && selectedFiles.length > 0) {
                                setFiles(selectedFiles);
                                handleUpload(selectedFiles);
                            }
                        }}
                        className="hidden"
                    />
                </label>

                <div className="mt-4 flex min-h-6 items-center justify-center text-sm">
                    {message && <span className="font-medium text-emerald-600 text-center">{message}</span>}
                    {error && <span className="font-medium text-rose-600 text-center">{error}</span>}
                </div>
            </div>
        </section>
    );
}