import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  QrCode, 
  Settings2, 
  Type, 
  Palette, 
  Maximize2,
  RefreshCw,
  Share2,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

type QRFormat = 'png' | 'jpg' | 'svg';
type ECCLevel = 'L' | 'M' | 'Q' | 'H';

export default function App() {
  const [content, setContent] = useState('https://studio.design/portfolio/collection-2024');
  const [size, setSize] = useState([1000]);
  const [margin, setMargin] = useState([4]);
  const [color, setColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [format, setFormat] = useState<QRFormat>('svg');
  const [ecc, setEcc] = useState<ECCLevel>('Q');
  const [isGenerating, setIsGenerating] = useState(false);

  // Construct the API URL for preview (smaller size for better performance)
  const previewSize = 400;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(content || ' ')}&size=${previewSize}x${previewSize}&margin=${margin[0]}&color=${color.replace('#', '')}&bgcolor=${bgColor.replace('#', '')}&ecc=${ecc}&format=${format}`;

  // Debounced effect to simulate generation state
  useEffect(() => {
    setIsGenerating(true);
    const timer = setTimeout(() => setIsGenerating(false), 300);
    return () => clearTimeout(timer);
  }, [content, size, margin, color, bgColor, ecc, format]);

  const handleDownload = async (exportFormat: QRFormat = format) => {
    const downloadUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(content || ' ')}&size=${size[0]}x${size[0]}&margin=${margin[0]}&color=${color.replace('#', '')}&bgcolor=${bgColor.replace('#', '')}&ecc=${ecc}&format=${exportFormat}`;
    
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
      
      toast.success(`Successfully exported as ${exportFormat.toUpperCase()}`, {
        icon: <CheckCircle2 className="h-4 w-4 text-accent" />,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download QR code. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-accent/20">
      {/* Header */}
      <header className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded flex items-center justify-center font-bold text-background text-sm shadow-[0_0_15px_rgba(56,189,248,0.4)]">QR</div>
          <span className="text-xl font-bold tracking-tight font-serif italic text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Spark Origin</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-300 font-bold hidden sm:block">
          Precision Encoder v2.4
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" className="h-8 text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-white hover:bg-white/10" onClick={() => window.location.reload()}>
            Reset
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs font-bold uppercase tracking-wider border-white/20 hover:bg-white/10 text-white bg-transparent" onClick={() => {
            navigator.clipboard.writeText(content);
            toast.info('Copied to clipboard');
          }}>
            <Share2 className="h-3 w-3 mr-2" />
            Share
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-12">
        <div className="w-full max-w-5xl glass-panel grid grid-cols-1 md:grid-cols-12 overflow-hidden shadow-2xl rounded-xl ring-1 ring-white/10">
          {/* Controls Column */}
          <div className="md:col-span-7 p-6 md:p-10 border-r border-white/5 space-y-8 bg-black/10">
            <div>
              <h2 className="text-2xl font-semibold mb-2 text-white tracking-tight">Create New QR</h2>
              <p className="text-slate-300 text-sm font-light leading-relaxed">Enter content and configure encoding parameters below.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Data Content</Label>
                <Input 
                  placeholder="https://example.com/exclusive-access" 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="input-field-style h-12 text-sm text-white focus-visible:ring-0 focus-visible:ring-offset-0 border-white/20 ring-0 rounded-md placeholder:text-slate-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Size (px)</Label>
                  <Select value={size[0].toString()} onValueChange={(v) => setSize([parseInt(v)])}>
                    <SelectTrigger className="input-field-style h-11 border-white/20 text-sm ring-0 text-white font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f172a] border-white/20 text-white">
                      <SelectItem value="250">250 x 250</SelectItem>
                      <SelectItem value="500">500 x 500</SelectItem>
                      <SelectItem value="1000">1000 x 1000</SelectItem>
                      <SelectItem value="2000">2000 x 2000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Error Correction</Label>
                  <Select value={ecc} onValueChange={(v: ECCLevel) => setEcc(v)}>
                    <SelectTrigger className="input-field-style h-11 border-white/20 text-sm ring-0 text-white font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f172a] border-white/20 text-white">
                      <SelectItem value="L">Level L (7%)</SelectItem>
                      <SelectItem value="M">Level M (15%)</SelectItem>
                      <SelectItem value="Q">Level Q (25%)</SelectItem>
                      <SelectItem value="H">Level H (30%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Quiet Zone (Margin)</Label>
                <div className="flex items-center gap-4 py-2 min-h-10">
                  <Slider 
                    value={margin} 
                    onValueChange={(val) => {
                      if (Array.isArray(val)) setMargin(val);
                      else if (typeof val === 'number') setMargin([val]);
                    }} 
                    max={20} 
                    min={0} 
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono text-white w-10 text-right font-medium tabular-nums">{margin[0]}px</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Foreground Color</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="color" 
                      value={color} 
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-11 p-1 bg-black/50 border-white/20 rounded cursor-pointer hover:border-white/40 transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Background Color</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="color" 
                      value={bgColor} 
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-full h-11 p-1 bg-black/50 border-white/20 rounded cursor-pointer hover:border-white/40 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  className="w-full h-12 bg-foreground text-background font-bold uppercase tracking-widest text-[10px] hover:bg-foreground/90 transition-all rounded-md shadow-xl shadow-accent/5 active:scale-[0.99]"
                  onClick={() => handleDownload()}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Compile & Export {format.toUpperCase()}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview Column */}
          <div className="md:col-span-5 bg-black/30 p-6 md:p-10 flex flex-col items-center justify-center relative min-h-[400px]">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div 
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-10"
                >
                  <RefreshCw className="h-6 w-6 animate-spin text-accent" />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800 p-8 rounded-xl shadow-2xl mb-8 w-full max-w-[280px] flex items-center justify-center aspect-square ring-1 ring-white/10"
            >
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent to-blue-600 rounded opacity-20 blur group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                <img 
                  key={qrUrl}
                  src={qrUrl} 
                  alt="QR Code" 
                  className="relative w-full h-full object-contain shadow-2xl transition-opacity duration-300"
                  onLoad={() => setIsGenerating(false)}
                />
              </div>
            </motion.div>

            <div className="flex flex-col gap-4 w-full">
              <p className="text-center text-[10px] text-slate-400 font-mono uppercase tracking-[0.2em]">
                OUTPUT: {format === 'svg' ? 'Scalar Vector' : 'Raster Array'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['png', 'jpg', 'svg'] as QRFormat[]).map((f) => (
                  <Button 
                    key={f}
                    variant="outline"
                    className={`h-9 text-[9px] font-black uppercase tracking-widest border-white/5 hover:bg-white/5 transition-all ${format === f ? 'border-accent/40 text-accent bg-accent/5' : 'text-slate-400'}`}
                    onClick={() => setFormat(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
              <p className="text-[9px] text-center text-slate-500 font-bold px-4 leading-relaxed mt-6 uppercase tracking-widest opacity-60">
                ACTIVE PIPELINE &bull; {content.substring(0, 15)}...
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-8 text-center text-slate-500 text-[9px] uppercase tracking-[0.4em] border-t border-white/5 bg-transparent font-medium">
        Precision Engineering &bull; {new Date().getFullYear()} Systems &bull; Nodes Active
      </footer>
      
      <Toaster 
        toastOptions={{
          className: 'bg-slate-900 border-white/10 text-foreground text-xs uppercase tracking-wider font-bold',
        }}
        position="bottom-right" 
        closeButton 
        richColors 
      />
    </div>
  );
}

