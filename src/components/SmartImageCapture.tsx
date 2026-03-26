import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Check,
  RotateCcw,
  Image as ImageIcon,
  ZoomIn,
  Loader2,
  FlipHorizontal,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SmartImageCaptureProps {
  currentImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
  itemName?: string;
}

type Mode = 'idle' | 'camera' | 'preview';

// ─── Processamento de imagem no canvas ─────────────────────────────────────
async function processImage(
  source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | File,
  mirror = false
): Promise<string> {
  const TARGET_SIZE = 900;

  let sourceBitmap: ImageBitmap;
  if (source instanceof File) {
    sourceBitmap = await createImageBitmap(source);
  } else if (source instanceof HTMLVideoElement) {
    sourceBitmap = await createImageBitmap(source);
  } else if (source instanceof HTMLImageElement) {
    sourceBitmap = await createImageBitmap(source);
  } else {
    // já é canvas
    sourceBitmap = await createImageBitmap(source);
  }

  const sw = sourceBitmap.width;
  const sh = sourceBitmap.height;

  // Crop quadrado centralizado
  const side = Math.min(sw, sh);
  const sx = (sw - side) / 2;
  const sy = (sh - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Fundo branco puro
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

  // Espelhar se necessário (selfie cam)
  if (mirror) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(sourceBitmap, sx, sy, side, side, -TARGET_SIZE, 0, TARGET_SIZE, TARGET_SIZE);
    ctx.restore();
  } else {
    ctx.drawImage(sourceBitmap, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);
  }

  // Melhoria de contraste e brilho via ImageData
  const imageData = ctx.getImageData(0, 0, TARGET_SIZE, TARGET_SIZE);
  const data = imageData.data;

  // Auto levels: encontra min/max
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }

  const range = max - min || 1;
  const contrast = 1.15; // ligeiro aumento de contraste
  const brightness = 8;  // leve claridade

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      // auto stretch
      let val = ((data[i + c] - min) / range) * 255;
      // contraste
      val = (val - 128) * contrast + 128;
      // brilho
      val = val + brightness;
      data[i + c] = Math.min(255, Math.max(0, val));
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Vinheta sutil (borda escura suave para dar profundidade)
  const gradient = ctx.createRadialGradient(
    TARGET_SIZE / 2, TARGET_SIZE / 2, TARGET_SIZE * 0.35,
    TARGET_SIZE / 2, TARGET_SIZE / 2, TARGET_SIZE * 0.72
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

  return canvas.toDataURL('image/jpeg', 0.92);
}

function dataURLtoFile(dataURL: string, filename: string): File {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}
// ───────────────────────────────────────────────────────────────────────────

export default function SmartImageCapture({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  itemName = 'item',
}: SmartImageCaptureProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(currentImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [mirror, setMirror] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza URL externa
  useEffect(() => {
    setSavedUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  // Inicia câmera
  const startCamera = useCallback(async () => {
    setCameraError('');
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // câmera traseira no mobile
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError('Câmera não disponível. Use o upload de arquivo.');
      setMode('idle');
    }
  }, []);

  // Para câmera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Fecha câmera ao sair
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Captura frame da câmera
  const captureFromCamera = useCallback(async () => {
    if (!videoRef.current) return;
    setProcessing(true);
    try {
      const dataUrl = await processImage(videoRef.current, mirror);
      setPreviewDataUrl(dataUrl);
      stopCamera();
      setMode('preview');
    } finally {
      setProcessing(false);
    }
  }, [mirror, stopCamera]);

  // Upload de arquivo local
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        alert('Selecione apenas imagens (JPG, PNG, WEBP)');
        return;
      }
      setProcessing(true);
      try {
        const dataUrl = await processImage(file, false);
        setPreviewDataUrl(dataUrl);
        setMode('preview');
      } finally {
        setProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    []
  );

  // Drag & Drop
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      setProcessing(true);
      try {
        const dataUrl = await processImage(file, false);
        setPreviewDataUrl(dataUrl);
        setMode('preview');
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  // Confirma e faz upload
  const confirmUpload = async () => {
    if (!previewDataUrl) return;
    setUploading(true);
    try {
      const file = dataURLtoFile(
        previewDataUrl,
        `${itemName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`
      );
      const filePath = `item-photos/${file.name}`;

      const { error } = await supabase.storage
        .from('item-photos')
        .upload(filePath, file, { upsert: true, contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('item-photos')
        .getPublicUrl(filePath);

      setSavedUrl(publicUrl);
      onImageUploaded(publicUrl);
      setPreviewDataUrl(null);
      setMode('idle');
    } catch (err) {
      console.error('Erro upload:', err);
      alert('Erro ao enviar imagem. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  // Remove imagem salva
  const handleRemove = async () => {
    if (savedUrl) {
      try {
        const parts = savedUrl.split('/');
        const fileName = parts[parts.length - 1];
        await supabase.storage
          .from('item-photos')
          .remove([`item-photos/${fileName}`]);
      } catch { /* ignora erros de remoção */ }
    }
    setSavedUrl(null);
    setPreviewDataUrl(null);
    setMode('idle');
    onImageRemoved();
  };

  const cancelPreview = () => {
    setPreviewDataUrl(null);
    setMode('idle');
    stopCamera();
  };

  // ── RENDER ──────────────────────────────────────────────────────────────

  // Estado: tem imagem salva
  if (savedUrl && mode === 'idle') {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-charcoal">Foto do Item</label>
        <div className="relative group rounded-xl overflow-hidden border-2 border-gold-ak shadow-md">
          <img
            src={savedUrl}
            alt={itemName}
            className="w-full h-52 object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
          />
          {/* Badge de zoom */}
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="w-3 h-3" /> Ver maior
          </div>
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 bg-gold-ak text-white rounded-lg shadow hover:bg-amber-600 transition-colors"
              title="Trocar foto"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-colors"
              title="Remover foto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lightbox simples */}
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={savedUrl}
              alt={itemName}
              className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  // Estado: câmera ativa
  if (mode === 'camera') {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-charcoal">Câmera ao Vivo</label>
        {cameraError ? (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{cameraError}</div>
        ) : (
          <div className="relative rounded-xl overflow-hidden border-2 border-gold-ak bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
              style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
            />
            {/* Guia de enquadramento */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/50 rounded-xl" />
            </div>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-4">
              <button
                type="button"
                onClick={() => setMirror((m) => !m)}
                className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                title="Espelhar"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={captureFromCamera}
                disabled={processing}
                className="w-16 h-16 rounded-full bg-white border-4 border-gold-ak shadow-xl flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
              >
                {processing ? (
                  <Loader2 className="w-7 h-7 animate-spin text-gold-ak" />
                ) : (
                  <Camera className="w-7 h-7 text-gold-ak" />
                )}
              </button>
              <button
                type="button"
                onClick={cancelPreview}
                className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                title="Cancelar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Estado: preview para confirmar
  if (mode === 'preview' && previewDataUrl) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-charcoal">
          Pré-visualização — confirme antes de salvar
        </label>
        <div className="relative rounded-xl overflow-hidden border-2 border-gold-ak shadow-md">
          <img
            src={previewDataUrl}
            alt="Preview"
            className="w-full h-52 object-cover"
          />
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            ✨ Processada
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirmUpload}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {uploading ? 'Salvando...' : 'Confirmar e Salvar'}
          </button>
          <button
            type="button"
            onClick={cancelPreview}
            disabled={uploading}
            className="px-4 flex items-center gap-1.5 border-2 border-line text-charcoal font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <RotateCcw className="w-4 h-4" />
            Refazer
          </button>
        </div>
      </div>
    );
  }

  // Estado: idle — sem imagem
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-charcoal">Foto do Item</label>

      {processing ? (
        <div className="border-2 border-dashed border-gold-ak rounded-xl p-8 flex flex-col items-center gap-3 bg-amber-50">
          <Loader2 className="w-8 h-8 animate-spin text-gold-ak" />
          <p className="text-sm font-medium text-charcoal">Processando imagem...</p>
          <p className="text-xs text-gray-medium">Aplicando ajustes de qualidade</p>
        </div>
      ) : (
        <>
          {/* Área de drag & drop / upload */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-line hover:border-gold-ak rounded-xl p-6 text-center cursor-pointer hover:bg-amber-50/50 transition-all group"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-gray-100 group-hover:bg-amber-100 rounded-full transition-colors">
                <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-gold-ak transition-colors" />
              </div>
              <p className="text-sm font-semibold text-charcoal">
                Arraste uma foto ou clique para selecionar
              </p>
              <p className="text-xs text-gray-medium">JPG, PNG, WEBP • Até 10MB</p>
            </div>
          </div>

          {/* Botão câmera separado */}
          <button
            type="button"
            onClick={startCamera}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-gold-ak text-gold-ak font-semibold rounded-xl hover:bg-gold-ak hover:text-white transition-all"
          >
            <Camera className="w-4 h-4" />
            Abrir Câmera
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2 text-gray-medium text-sm hover:text-charcoal transition-colors"
          >
            <Upload className="w-4 h-4" />
            Selecionar arquivo
          </button>
        </>
      )}

      {cameraError && (
        <p className="text-xs text-red-500 mt-1">{cameraError}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
