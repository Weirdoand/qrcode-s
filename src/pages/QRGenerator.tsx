import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Download, Share2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../i18n/index';

type QRFormat = 'png' | 'jpg' | 'svg';

export default function QR生器() {
  const { t, i18n } = useTranslation();
  const [content, setContent] = useState('https://example.com');
  const [size, setSize] = useState([1000]);
  const [margin, setMargin] = useState([4]);
  const [color, setColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [format, setFormat] = useState<QRFormat>('png');
  const [isGenerating, setIsGenerating] = useState(false);

  const previewSize = 400;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(content || ' ')}&size=${previewSize}x${previewSize}&margin=${margin[0]}&color=${color.replace('#', '')}&bgcolor=${bgColor.replace('#', '')}&ecc=Q&format=${format}`;

  function changeLanguage(lang: string) {
    i18n.changeLanguage(lang);
  }

  async function handleDownload(exportFormat: QRFormat = format) {
    const downloadUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(content || ' ')}&size=${size[0]}x${size[0]}&margin=${margin[0]}&color=${color.replace('#', '')}&bgcolor=${bgColor.replace('#', '')}&ecc=Q&format=${exportFormat}`;
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qrcode-${Date.now()}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`已导出 ${exportFormat.toUpperCase()} 格式`, { icon: <CheckCircle2 className="h-4 w-4 text-sky-400" /> });
    } catch {
      toast.error('下载失败，请重试');
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-md sticky top-0 z-10">
        <span className="text-white font-semibold">QR {t('tool.title')}</span>
        <select value={i18n.language} onChange={e => changeLanguage(e.target.value)} className="bg-transparent text-slate-400 text-xs border border-white/10 rounded px-2 py-1 cursor-pointer">
          {SUPPORTED_LANGUAGES.map(lang => (
            <option key={lang} value={lang} className="bg-slate-900">{LANGUAGE_LABELS[lang]}</option>
          ))}
        </select>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl glass-panel grid grid-cols-1 md:grid-cols-12 overflow-hidden shadow-2xl rounded-xl ring-1 ring-white/10">
          {/* Controls */}
          <div className="md:col-span-7 p-6 md:p-10 border-r border-white/5 space-y-8 bg-black/10">
            <div>
              <h2 className="text-2xl font-semibold mb-2 text-white tracking-tight">{t('tool.createTitle')}</h2>
              <p className="text-slate-300 text-sm">{t('tool.createSub')}</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">{t('tool.content')}</Label>
                <Input
                  placeholder="https://example.com"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="input-field-style h-12 text-sm text-white border-white/20 ring-0 rounded-md placeholder:text-slate-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">{t('tool.size')}</Label>
                  <Select value={size[0].toString()} onValueChange={v => setSize([parseInt(v)])}>
                    <SelectTrigger className="input-field-style h-11 border-white/20 text-sm ring-0 text-white font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f172a] border-white/20 text-white">
                      <SelectItem value="250">250 × 250</SelectItem>
                      <SelectItem value="500">500 × 500</SelectItem>
                      <SelectItem value="1000">1000 × 1000</SelectItem>
                      <SelectItem value="2000">2000 × 2000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">{t('tool.margin')}</Label>
                  <div className="flex items-center gap-4 py-2 min-h-10">
                    <Slider value={margin} onValueChange={val => setMargin(Array.isArray(val) ? val : [val])} max={20} min={0} step={1} className="flex-1" />
                    <span className="text-sm font-mono text-white w-10 text-right tabular-nums">{margin[0]}px</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">{t('tool.fgColor')}</Label>
                  <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-11 p-1 bg-black/50 border-white/20 rounded cursor-pointer" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">{t('tool.bgColor')}</Label>
                  <Input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full h-11 p-1 bg-black/50 border-white/20 rounded cursor-pointer" />
                </div>
              </div>

              <Button className="w-full h-12 bg-sky-400 text-slate-950 font-bold hover:bg-sky-300 transition-all rounded-md shadow-xl active:scale-[0.99]" onClick={() => handleDownload()}>
                <Download className="h-4 w-4 mr-2" />{t('tool.download')} {format.toUpperCase()}
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="md:col-span-5 bg-black/30 p-6 md:p-10 flex flex-col items-center justify-center relative min-h-[400px]">
            <div className="bg-slate-800 p-8 rounded-xl shadow-2xl mb-8 w-full max-w-[280px] flex items-center justify-center aspect-square ring-1 ring-white/10">
              <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain shadow-2xl" onLoad={() => setIsGenerating(false)} />
            </div>

            <div className="flex flex-col gap-4 w-full">
              <p className="text-center text-[10px] text-slate-400 font-mono uppercase tracking-[0.2em]">{t('tool.output')}: {format === 'svg' ? 'SVG' : 'PNG'}</p>
              <div className="grid grid-cols-3 gap-2">
                {(['png', 'jpg', 'svg'] as QRFormat[]).map(f => (
                  <Button key={f} variant="outline" className={`h-9 text-[9px] font-black uppercase tracking-widest border-white/5 hover:bg-white/5 transition-all ${format === f ? 'border-sky-400/40 text-sky-400 bg-sky-400/5' : 'text-slate-400'}`} onClick={() => setFormat(f)}>
                    {f}
                  </Button>
                ))}
              </div>
              <p className="text-[9px] text-center text-slate-500 font-bold px-4 leading-relaxed mt-4 uppercase tracking-widest opacity-60">{content.substring(0, 20)}...</p>
            </div>
          </div>
        </div>
      </main>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}