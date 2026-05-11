import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Code } from '../lib/api';

export default function LivePage() {
  const { slug } = useParams<{ slug: string }>();
  const [code, setCode] = useState<Code | null>(null);
  const [error, setError] = useState<'loading' | 'not_found' | 'done'>('loading');

  useEffect(() => {
    if (!slug) return;
    api.getLiveCode(slug)
      .then(c => {
        if (c.type === 'url') {
          window.location.replace(c.target);
          return;
        }
        setCode(c);
        setError('done');
      })
      .catch(() => setError('not_found'));
  }, [slug]);

  if (error === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-sky-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error === 'not_found') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-6xl">🔍</div>
        <h1 className="text-white text-2xl font-bold">Code not found</h1>
        <p className="text-slate-400 text-sm">This QR code may have been deleted.</p>
      </div>
    );
  }

  if (!code) return null;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      {code.title && (
        <div className="mb-6 text-center">
          <h1 className="text-white text-xl font-semibold">{code.title}</h1>
          {code.description && <p className="text-slate-400 text-sm mt-1">{code.description}</p>}
        </div>
      )}

      <div className="w-full max-w-sm">
        <img
          src={code.target}
          alt={code.title}
          className="w-full rounded-2xl shadow-2xl object-contain"
          style={{ maxHeight: '75vh' }}
        />
      </div>

      <p className="mt-6 text-slate-600 text-xs text-center">
        Long-press the image to scan or save
      </p>

      <div className="mt-4 text-slate-700 text-xs font-mono">
        liveqr · /{slug}
      </div>
    </div>
  );
}
