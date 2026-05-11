import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '@/components/ui/button';
import { QrCode, RefreshCw, Download, Shield } from 'lucide-react';

export default function Home() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  function handleCTA() {
    if (user) {
      navigate('/dashboard');
    } else {
      login();
    }
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
        <div>
          {loading ? null : user ? (
            <Button size="sm" onClick={() => navigate('/dashboard')} className="bg-sky-400 text-slate-950 hover:bg-sky-300 font-semibold">
              Dashboard
            </Button>
          ) : (
            <Button size="sm" onClick={login} variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
              Sign in with Google
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-400/10 border border-sky-400/20 text-sky-400 text-xs font-semibold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          Always up-to-date
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight mb-6 max-w-3xl leading-tight">
          One QR code.{' '}
          <span className="text-sky-400">Update it forever.</span>
        </h1>

        <p className="text-slate-400 text-lg max-w-xl mb-10 leading-relaxed">
          Create a permanent QR code that always points to your latest content.
          Change the group invite screenshot anytime — no need to reprint or redistribute the code.
        </p>

        <Button
          size="lg"
          onClick={handleCTA}
          className="bg-sky-400 text-slate-950 hover:bg-sky-300 font-bold px-8 h-12 text-base shadow-[0_0_30px_rgba(56,189,248,0.3)] transition-all hover:shadow-[0_0_40px_rgba(56,189,248,0.5)]"
        >
          {user ? 'Go to Dashboard' : 'Get started — it\'s free'}
        </Button>

        {/* Feature grid */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            {
              icon: <QrCode className="h-5 w-5 text-sky-400" />,
              title: 'Permanent QR Code',
              desc: 'The QR code URL never changes, so printed codes stay valid forever.',
            },
            {
              icon: <RefreshCw className="h-5 w-5 text-sky-400" />,
              title: 'Update Anytime',
              desc: 'Upload a new image or change the link in seconds from your dashboard.',
            },
            {
              icon: <Download className="h-5 w-5 text-sky-400" />,
              title: 'Download & Share',
              desc: 'Download your permanent QR as a high-res PNG to print or share.',
            },
          ].map(f => (
            <div key={f.title} className="glass-panel rounded-xl p-6 text-left">
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
        LiveQR · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
