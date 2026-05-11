import { useEffect, useState, useRef, useCallback, type DragEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { api, type Code, liveUrl, qrImageUrl, formatDate } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { ArrowLeft, Download, ExternalLink, X, ImageIcon, Loader2, BarChart2, Copy, RefreshCw } from 'lucide-react';

export default function EditCode() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState<Code | null>(null);
  const [fetching, setFetching] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) { navigate('/'); return; }
    if (loading || !id) return;
    api.getCode(id).then(c => {
      setCode(c);
      setTitle(c.title);
      setDescription(c.description ?? '');
    }).catch(() => {
      toast.error(t('edit.notFound'));
      navigate('/dashboard');
    }).finally(() => setFetching(false));
  }, [loading, user, id, navigate, t]);

  function handleFileSelect(selected: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      toast.error(t('create.invalidType'));
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      toast.error(t('create.tooLarge'));
      return;
    }
    setNewFile(selected);
    setNewPreview(URL.createObjectURL(selected));
  }

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!code || !id) return;
    if (!title.trim()) { toast.error(t('edit.titleRequired')); return; }
    setSaving(true);
    try {
      let target = code.target;
      if (newFile) {
        const { url } = await api.uploadImage(newFile);
        target = url;
      }
      const updated = await api.updateCode(id, { title: title.trim(), description: description.trim() || undefined, target });
      setCode(updated);
      setNewFile(null);
      setNewPreview(null);
      toast.success(t('edit.success'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('edit.updateFail'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadQR() {
    if (!code) return;
    const url = qrImageUrl(liveUrl(code.slug), 1000);
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `liveqr-${code.slug}.png`;
    a.click();
  }

  if (fetching) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
    </div>
  );
  if (!code) return null;

  const permalink = liveUrl(code.slug);
  const qrPreview = qrImageUrl(permalink, 400);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 py-4 border-b border-white/5 flex items-center gap-4 bg-black/20 backdrop-blur-md sticky top-0 z-20">
        <Button size="sm" variant="ghost" onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white hover:bg-white/10 -ml-1">
          <ArrowLeft className="h-4 w-4 mr-1.5" />{t('edit.back')}
        </Button>
        <span className="text-white font-semibold truncate">{code.title}</span>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div>
          <h2 className="text-lg font-semibold text-white mb-5">{t('edit.editTitle')}</h2>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{t('edit.titleLabel')} *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="input-field-style h-11 text-white" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{t('edit.descLabel')}</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="input-field-style h-11 text-white" maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{t('edit.imageLabel')} <span className="text-slate-600 normal-case">{t('edit.imageReplace')}</span></Label>
              {!newFile && (
                <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
                  <img src={code.target} alt="current" className="w-full object-contain max-h-56" />
                  <div className="px-4 py-2 text-xs text-slate-500">{t('edit.currentImageSub')}</div>
                </div>
              )}
              {newFile && (
                <div className="relative rounded-xl overflow-hidden border border-sky-400/30 bg-black/20">
                  <img src={newPreview!} alt="new" className="w-full object-contain max-h-56" />
                  <Button type="button" size="sm" variant="ghost" className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white h-7 w-7 p-0 rounded-full" onClick={() => { setNewFile(null); setNewPreview(null); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <div className="px-4 py-2 text-xs text-sky-400">{t('edit.newImageSub', { size: (newFile.size / 1024).toFixed(0) })}</div>
                </div>
              )}
              <div
                className={`border-2 border-dashed rounded-xl p-6 flex items-center gap-4 cursor-pointer transition-colors ${dragOver ? 'border-sky-400 bg-sky-400/5' : 'border-white/10 hover:border-white/25'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <div className="w-9 h-9 rounded-lg bg-sky-400/10 flex items-center justify-center shrink-0">
                  <ImageIcon className="h-4 w-4 text-sky-400" />
                </div>
                <p className="text-sm text-slate-400">{t('edit.dropHint')} <span className="text-sky-400">{t('edit.browse')}</span></p>
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full h-11 bg-sky-400 text-slate-950 hover:bg-sky-300 font-bold">
              {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('edit.saving')}</>) : (<><RefreshCw className="h-4 w-4 mr-2" />{t('edit.save')}</>)}
            </Button>
          </form>
        </div>

        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-white">{t('edit.qrTitle')}</h2>
          <div className="glass-panel rounded-xl p-5 flex flex-col items-center gap-4">
            <div className="bg-white p-3 rounded-xl shadow-xl">
              <img src={qrPreview} alt="QR" className="w-48 h-48 object-contain" />
            </div>
            <p className="text-xs text-slate-400 text-center font-mono break-all">{permalink}</p>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1 h-9 text-xs border-white/15 text-slate-300 hover:bg-white/10 bg-transparent" onClick={() => { navigator.clipboard.writeText(permalink); toast.success(t('edit.linkCopied')); }}>
                <Copy className="h-3.5 w-3.5 mr-1.5" />{t('edit.copyLink')}
              </Button>
              <a href={permalink} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" className="w-full h-9 text-xs border-white/15 text-slate-300 hover:bg-white/10 bg-transparent">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />{t('edit.open')}
                </Button>
              </a>
            </div>
            <Button onClick={handleDownloadQR} className="w-full h-9 text-xs bg-sky-400 text-slate-950 hover:bg-sky-300 font-semibold">
              <Download className="h-3.5 w-3.5 mr-1.5" />{t('edit.downloadQR')}
            </Button>
          </div>
          <Separator className="bg-white/5" />
          <div className="glass-panel rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest text-xs">{t('edit.statsTitle')}</h3>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-400/10 flex items-center justify-center">
                <BarChart2 className="h-4 w-4 text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{code.visit_count}</p>
                <p className="text-xs text-slate-500">{t('edit.totalScans')}</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-1 pt-1">
              <p>{t('edit.created', { date: formatDate(code.created_at) })}</p>
              <p>{t('edit.lastUpdated', { date: formatDate(code.updated_at) })}</p>
            </div>
          </div>
        </div>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}