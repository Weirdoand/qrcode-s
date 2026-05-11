import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { api, type Code, liveUrl, formatDate } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Plus, QrCode, ExternalLink, Pencil, Trash2, BarChart2, LogOut, Copy } from 'lucide-react';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [codes, setCodes] = useState<Code[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    try {
      const data = await api.listCodes();
      setCodes(data);
    } catch {
      toast.error(t('dashboard.loadFail'));
    } finally {
      setFetching(false);
    }
  }, [t]);

  useEffect(() => {
    if (!loading && !user) { navigate('/'); return; }
    if (!loading) fetchCodes();
  }, [loading, user, navigate, fetchCodes]);

  async function handleDelete(id: string) {
    if (!confirm(t('dashboard.deleteConfirm'))) return;
    setDeleting(id);
    try {
      await api.deleteCode(id);
      setCodes(prev => prev.filter(c => c.id !== id));
      toast.success(t('dashboard.deleteSuccess'));
    } catch {
      toast.error(t('dashboard.deleteFail'));
    } finally {
      setDeleting(null);
    }
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(liveUrl(slug));
    toast.success(t('dashboard.linkCopied'));
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-7 h-7 bg-sky-400 rounded-md flex items-center justify-center font-bold text-slate-950 text-xs shadow-[0_0_12px_rgba(56,189,248,0.35)]">QR</div>
          <span className="text-base font-semibold text-white">LiveQR</span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <img src={user.picture} alt="" className="w-7 h-7 rounded-full" />
              <span className="text-sm text-slate-300 hidden sm:block">{user.name}</span>
            </div>
          )}
          <Button size="sm" variant="ghost" onClick={handleLogout} className="text-slate-400 hover:text-white hover:bg-white/10">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{t('dashboard.used', { count: codes.length })}</p>
          </div>
          <Button onClick={() => navigate('/dashboard/new')} disabled={codes.length >= 20} className="bg-sky-400 text-slate-950 hover:bg-sky-300 font-semibold">
            <Plus className="h-4 w-4 mr-1.5" />{t('dashboard.newCode')}
          </Button>
        </div>

        <Separator className="mb-6 bg-white/5" />

        {!fetching && codes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-400/10 flex items-center justify-center">
              <QrCode className="h-8 w-8 text-sky-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">{t('dashboard.noCodesTitle')}</h2>
            <p className="text-slate-400 max-w-xs text-sm">{t('dashboard.noCodesDesc')}</p>
            <Button onClick={() => navigate('/dashboard/new')} className="bg-sky-400 text-slate-950 hover:bg-sky-300 font-semibold mt-2">
              <Plus className="h-4 w-4 mr-1.5" />{t('dashboard.noCodesCta')}
            </Button>
          </div>
        )}

        {fetching && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-panel rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-white/5 rounded w-1/3 mb-2" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!fetching && codes.length > 0 && (
          <div className="space-y-3">
            {codes.map(code => (
              <div key={code.id} className="glass-panel rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold truncate">{code.title}</h3>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-sky-400/10 text-sky-400 font-mono shrink-0">{code.slug}</span>
                  </div>
                  {code.description && <p className="text-slate-400 text-sm truncate mb-1">{code.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><BarChart2 className="h-3 w-3" />{t('dashboard.scans', { count: code.visit_count })}</span>
                    <span>{t('dashboard.updated', { date: formatDate(code.updated_at) })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 h-8 w-8 p-0" title={t('dashboard.copyLink')} onClick={() => copyLink(code.slug)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <a href={liveUrl(code.slug)} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 h-8 w-8 p-0" title={t('dashboard.openLive')}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 h-8 w-8 p-0" title={t('dashboard.edit')} onClick={() => navigate(`/dashboard/${code.id}`)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 h-8 w-8 p-0" title={t('dashboard.delete')} disabled={deleting === code.id} onClick={() => handleDelete(code.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Toaster position="bottom-right" />
    </div>
  );
}