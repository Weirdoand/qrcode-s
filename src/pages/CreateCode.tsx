import { useState, useRef, useCallback, type DragEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { ArrowLeft, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function CreateCode() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!loading && !user) { navigate('/'); return null; }

  function handleFileSelect(selected: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      toast.error(t('create.invalidType'));
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      toast.error(t('create.tooLarge'));
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error(t('create.titleRequired')); return; }
    if (!file) { toast.error(t('create.imageRequired')); return; }
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      await api.createCode({ title: title.trim(), description: description.trim() || undefined, type: 'image', target: url });
      toast.success(t('create.success'));
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg === 'limit_exceeded') toast.error(t('create.limitExceeded'));
      else toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 py-4 border-b border-white/5 flex items-center gap-4 bg-black/20 backdrop-blur-md sticky top-0 z-20">
        <Button size="sm" variant="ghost" onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white hover:bg-white/10 -ml-1">
          <ArrowLeft className="h-4 w-4 mr-1.5" />{t('create.back')}
        </Button>
        <span className="text-white font-semibold">{t('create.pageTitle')}</span>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-10">
        <form onSubmit={handleSubmit} className="space-y-7">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{t('create.titleLabel')} *</Label>
            <Input placeholder={t('create.titlePlaceholder')} value={title} onChange={e => setTitle(e.target.value)} className="input-field-style h-11 text-white" maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{t('create.descLabel')} <span className="text-slate-600 normal-case">{t('create.descOptional')}</span></Label>
            <Input placeholder={t('create.descPlaceholder')} value={description} onChange={e => setDescription(e.target.value)} className="input-field-style h-11 text-white" maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{t('create.imageLabel')} *</Label>
            {!file ? (
              <div
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${dragOver ? 'border-sky-400 bg-sky-400/5' : 'border-white/10 hover:border-white/25'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-xl bg-sky-400/10 flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-sky-400" />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">{t('create.dropHint')} <span className="text-sky-400">{t('create.browse')}</span></p>
                  <p className="text-slate-500 text-sm mt-1">{t('create.dropSub')}</p>
                </div>
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black/30 border border-white/10">
                <img src={preview!} alt="preview" className="w-full object-contain max-h-72" />
                <Button type="button" size="sm" variant="ghost" className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white h-7 w-7 p-0 rounded-full" onClick={() => { setFile(null); setPreview(null); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
                <div className="px-4 py-2.5 text-xs text-slate-400 truncate">{file.name} · {(file.size / 1024).toFixed(0)} KB</div>
              </div>
            )}
          </div>
          <Button type="submit" disabled={uploading} className="w-full h-11 bg-sky-400 text-slate-950 hover:bg-sky-300 font-bold">
            {uploading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('create.submitting')}</>) : (<><Upload className="h-4 w-4 mr-2" />{t('create.submit')}</>)}
          </Button>
        </form>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}