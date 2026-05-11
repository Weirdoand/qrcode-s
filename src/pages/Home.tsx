import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { Button } from '@/components/ui/button';
import { QrCode, RefreshCw, Download } from 'lucide-react';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../i18n/index';

export default function Home() {
  const { t, i18n } = useTranslation();
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  function handleCTA() {
    if (user) navigate('/dashboard');
    else login();
  }

  function changeLanguage(lang: string) {
    i18n.changeLanguage(lang);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-5 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-400 rounded-lg flex items-center justify-center font-bold text-slate-950 text-sm shadow-[0_0_15px_rgba(56,189,248,0.4)]">
            QR
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">LiveQR</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={i18n.language}
            onChange={e => changeLanguage(e.target.value)}
            className="bg-transparent text-slate-400 text-xs border border-white/10 rounded px-2 py-1 cursor-pointer hover:text-white"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang} value={lang} className="bg-slate-900 text-slate-300">
                {LANGUAGE_LABELS[lang]}
              </option>
            ))}
          </select>
          {loading ? null : user ? (
            <Button size="sm" onClick={() => navigate('/dashboard')} className="bg-sky-400 text-slate-950 hover:bg-sky-300 font-semibold">
              {t('nav.dashboard')}
            </Button>
          ) : (
            <Button size="sm" onClick={login} variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
              {t('nav.signIn')}
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-400/10 border border-sky-400/20 text-sky-400 text-xs font-semibold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          {t('home.badge')}
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight mb-6 max-w-3xl leading-tight">
          {t('home.headline1')}{' '}
          <span className="text-sky-400">{t('home.headline2')}</span>
        </h1>

        <p className="text-slate-400 text-lg max-w-xl mb-10 leading-relaxed">
          {t('home.sub')}
        </p>

        <Button
          size="lg"
          onClick={handleCTA}
          className="bg-sky-400 text-slate-950 hover:bg-sky-300 font-bold px-8 h-12 text-base shadow-[0_0_30px_rgba(56,189,248,0.3)] transition-all hover:shadow-[0_0_40px_rgba(56,189,248,0.5)]"
        >
          {user ? t('home.ctaDashboard') : t('home.cta')}
        </Button>

        {/* Feature grid */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            { icon: <QrCode className="h-5 w-5 text-sky-400" />, title: t('home.feature1Title'), desc: t('home.feature1Desc') },
            { icon: <RefreshCw className="h-5 w-5 text-sky-400" />, title: t('home.feature2Title'), desc: t('home.feature2Desc') },
            { icon: <Download className="h-5 w-5 text-sky-400" />, title: t('home.feature3Title'), desc: t('home.feature3Desc') },
          ].map((f, i) => (
            <div key={i} className="glass-panel rounded-xl p-6 text-left">
              <div className="mb-3 w-9 h-9 rounded-lg bg-sky-400/10 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="text-white font-semibold mb-1">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-8 text-center text-slate-600 text-xs border-t border-white/5">
        {t('footer.copy', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}