'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  Camera, 
  RefreshCw, 
  RotateCw, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Sliders, 
  Sparkles, 
  Check, 
  Flashlight, 
  AlertCircle, 
  Loader2,
  ScanFace,
  SunMedium
} from 'lucide-react'
import { toast } from 'sonner'
import { compressImageBeforeUpload } from '@/lib/imageCompression'

export interface ModalScannerFoto3x4Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFotoCapturada: (file: File, dataUrl: string) => void
  titulo?: string
  subtitulo?: string
}

export function ModalScannerFoto3x4({
  open,
  onOpenChange,
  onFotoCapturada,
  titulo = 'Escanear Foto 3x4 da Ficha',
  subtitulo = 'Enquadre a foto 3x4 colada na ficha física dentro da moldura guia'
}: ModalScannerFoto3x4Props) {
  // Modos: 'camera' (captura ao vivo) ou 'preview' (ajuste fino pós-captura)
  const [mode, setMode] = useState<'camera' | 'preview'>('camera')
  
  // Estados da Câmera
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isInitializingCamera, setIsInitializingCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [isTorchOn, setIsTorchOn] = useState(false)

  // Imagem capturada (Data URL em alta resolução)
  const [capturedImageRaw, setCapturedImageRaw] = useState<string | null>(null)
  
  // Estados de Ajuste Fino na Pré-visualização
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0) // 0, 90, 180, 270
  const [fineAngle, setFineAngle] = useState(0) // -15 a +15 graus
  const [enhancedContrast, setEnhancedContrast] = useState(false)
  const [brightness, setBrightness] = useState(100) // 80 a 140%
  const [isProcessing, setIsProcessing] = useState(false)

  // Controle de arraste (Drag / Pan)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const panStartRef = useRef({ x: 0, y: 0 })

  // 1. Função para parar todas as faixas da câmera e liberar memória/hardware
  const stopCameraStream = useCallback((streamToStop?: MediaStream | null) => {
    const activeStream = streamToStop || stream
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // Ignore
        }
      })
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStream(null)
    setIsTorchOn(false)
  }, [stream])

  // 2. Iniciar câmera com resolução ideal e constraints resilientes
  const startCamera = useCallback(async (desiredFacing: 'environment' | 'user') => {
    setIsInitializingCamera(true)
    setCameraError(null)
    stopCameraStream()

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Seu navegador não possui suporte para acesso direto à câmera.')
      setIsInitializingCamera(false)
      return
    }

    try {
      // Tenta abrir com a câmera desejada
      let mediaStream: MediaStream | null = null
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: desiredFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        })
      } catch {
        // Fallback genérico para qualquer câmera caso { ideal: facingMode } falhe
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        })
      }

      if (!mediaStream) {
        throw new Error('Não foi possível obter o stream de vídeo da câmera.')
      }

      setStream(mediaStream)

      // Verificar suporte a múltiplas câmeras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoInputs = devices.filter((d) => d.kind === 'videoinput')
        setHasMultipleCameras(videoInputs.length > 1)
      } catch {
        setHasMultipleCameras(false)
      }

      // Verificar suporte a Lanterna / Torch
      const videoTrack = mediaStream.getVideoTracks()[0]
      if (videoTrack && typeof (videoTrack as any).getCapabilities === 'function') {
        const capabilities = (videoTrack as any).getCapabilities()
        setHasTorch(Boolean(capabilities?.torch))
      } else {
        setHasTorch(false)
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((playErr) => {
            console.warn('[ModalScannerFoto3x4] Erro no autoplay do vídeo:', playErr)
          })
        }
      }
    } catch (err: any) {
      console.error('[ModalScannerFoto3x4] Erro ao iniciar câmera:', err)
      let msg = 'Não foi possível acessar a câmera do dispositivo.'
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Permissão de acesso à câmera foi negada. Permita o acesso nas configurações do navegador.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Nenhuma câmera foi encontrada no seu dispositivo.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'A câmera já está em uso por outro aplicativo.'
      }
      setCameraError(msg)
    } finally {
      setIsInitializingCamera(false)
    }
  }, [stopCameraStream])

  // Alternar Lanterna / Torch
  const toggleTorch = async () => {
    if (!stream || !hasTorch) return
    const track = stream.getVideoTracks()[0]
    if (!track) return

    try {
      const nextTorch = !isTorchOn
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      })
      setIsTorchOn(nextTorch)
    } catch (err) {
      console.warn('[ModalScannerFoto3x4] Erro ao alternar lanterna:', err)
      toast.error('Não foi possível ativar a lanterna neste aparelho.')
    }
  }

  // Alternar Câmera Frontal / Traseira
  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextFacing)
    startCamera(nextFacing)
  }

  // Ciclo de vida: Iniciar câmera quando o modal abrir em modo 'camera'
  useEffect(() => {
    if (open && mode === 'camera') {
      startCamera(facingMode)
    } else {
      stopCameraStream()
    }

    return () => {
      stopCameraStream()
    }
  }, [open, mode])

  // Desligar câmera se o usuário trocar de aba no navegador (Prevenção de Battery Drain)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && stream) {
        stopCameraStream()
      } else if (!document.hidden && open && mode === 'camera') {
        startCamera(facingMode)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [open, mode, stream, facingMode, startCamera, stopCameraStream])

  // Resetar estados ao fechar ou reabrir
  const handleClose = () => {
    stopCameraStream()
    setMode('camera')
    setCapturedImageRaw(null)
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
    setRotation(0)
    setFineAngle(0)
    setEnhancedContrast(false)
    setBrightness(100)
    onOpenChange(false)
  }

  // 3. Capturar frame de alta resolução e recortar na proporção 3x4
  const handleCaptureFrame = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Câmera não inicializada corretamente.')
      return
    }

    const vw = video.videoWidth
    const vh = video.videoHeight

    // Criar Canvas de alta resolução com as dimensões nativas do stream
    const rawCanvas = document.createElement('canvas')
    rawCanvas.width = vw
    rawCanvas.height = vh
    const rawCtx = rawCanvas.getContext('2d')
    if (!rawCtx) {
      toast.error('Erro ao acessar contexto gráfico de captura.')
      return
    }

    // Se estiver na câmera frontal (user), espelha horizontalmente para visual natural
    if (facingMode === 'user') {
      rawCtx.translate(vw, 0)
      rawCtx.scale(-1, 1)
    }

    rawCtx.drawImage(video, 0, 0, vw, vh)

    // Converter para data URL de alta qualidade
    const rawDataUrl = rawCanvas.toDataURL('image/jpeg', 0.95)
    setCapturedImageRaw(rawDataUrl)

    // Parar câmera imediatamente para liberar recursos
    stopCameraStream()

    // Resetar controles de ajuste fino
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
    setRotation(0)
    setFineAngle(0)
    setEnhancedContrast(false)
    setBrightness(100)

    // Mudar para tela de pré-visualização
    setMode('preview')
  }

  // Voltar para a câmera ("Tirar Outra")
  const handleRecapture = () => {
    setCapturedImageRaw(null)
    setMode('camera')
  }

  // Rotação em 90 graus
  const handleRotate90 = (direction: 'cw' | 'ccw') => {
    setRotation((prev) => {
      const delta = direction === 'cw' ? 90 : -90
      const next = (prev + delta + 360) % 360
      return next
    })
    setPan({ x: 0, y: 0 }) // Reseta o pan para manter centralizado
  }

  // Eventos de Arraste (Pan / Mover a Foto)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    panStartRef.current = { ...pan }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy
    })
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  // Touch handlers para Celular / Tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      panStartRef.current = { ...pan }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return
    const dx = e.touches[0].clientX - dragStartRef.current.x
    const dy = e.touches[0].clientY - dragStartRef.current.y
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy
    })
  }

  const handleTouchEnd = () => {
    isDraggingRef.current = false
  }

  // 4. Renderizar recorte final em alta definição e emitir imagem otimizada
  const handleConfirmCrop = async () => {
    if (!capturedImageRaw) return

    setIsProcessing(true)
    const toastId = toast.loading('Processando e otimizando foto 3x4...')

    try {
      // Carregar imagem base capturada
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Erro ao carregar frame de imagem para recorte.'))
        img.src = capturedImageRaw
      })

      // Dimensões finais do padrão 3x4 (Resolução de alta fidelidade: 900x1200 px)
      const targetWidth = 900
      const targetHeight = 1200

      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Não foi possível obter contexto 2D do Canvas.')

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // Filtros visuais (Nitidez e Brilho para documentos impressos)
      let filterString = `brightness(${brightness}%)`
      if (enhancedContrast) {
        filterString += ' contrast(125%) saturate(110%)'
      }
      ctx.filter = filterString

      // Centralização e Transformações Matemáticas no Canvas
      ctx.save()
      ctx.translate(targetWidth / 2, targetHeight / 2)

      // Rotação total (90° + Rotação fina de até 15°)
      const totalAngleRadians = ((rotation + fineAngle) * Math.PI) / 180
      ctx.rotate(totalAngleRadians)

      // Escala / Zoom
      ctx.scale(zoom, zoom)

      // Pan / Deslocamento proporcional à escala da imagem
      // Mapeamento das coordenadas da tela (viewfinder 210x280) para o canvas final (900x1200)
      const scaleFactor = targetWidth / 210
      ctx.translate(pan.x * scaleFactor, pan.y * scaleFactor)

      // Desenhar a imagem centralizada
      // Calcula escala base mantendo preenchimento 3x4
      const imgAspect = img.width / img.height
      const targetAspect = targetWidth / targetHeight

      let drawWidth = targetWidth
      let drawHeight = targetHeight

      if (imgAspect > targetAspect) {
        drawHeight = targetHeight
        drawWidth = targetHeight * imgAspect
      } else {
        drawWidth = targetWidth
        drawHeight = targetWidth / imgAspect
      }

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
      ctx.restore()

      // Converter canvas para Blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/webp', 0.92)
      })

      if (!blob) throw new Error('Erro ao gerar arquivo de imagem a partir do Canvas.')

      // Criar File padronizado
      const fileName = `foto_3x4_scan_${Date.now()}.webp`
      const rawFile = new File([blob], fileName, { type: 'image/webp', lastModified: Date.now() })

      // Passar pela pipeline oficial de compressão client-side do SIG
      const compressionResult = await compressImageBeforeUpload(rawFile, {
        maxWidth: 1200,
        maxHeight: 1600,
        quality: 0.85,
        mimeType: 'image/webp'
      })

      // Gerar Data URL para exibição imediata no formulário
      const finalDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(compressionResult.file)
      })

      // Emitir para o componente pai
      onFotoCapturada(compressionResult.file, finalDataUrl)
      toast.success('Foto 3x4 escaneada e aplicada com sucesso!', { id: toastId })
      handleClose()
    } catch (err: any) {
      console.error('[ModalScannerFoto3x4] Erro ao confirmar foto recortada:', err)
      toast.error(err.message || 'Erro ao processar foto escaneada.', { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent 
        className="bg-[#141416] text-card-foreground border border-borderCustom rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[95vh] flex flex-col overflow-hidden sm:max-w-[560px] z-[100]"
      >
        <DialogHeader className="shrink-0 pb-3 border-b border-borderCustom">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-highlight font-bold text-sm">
              <ScanFace className="w-5 h-5 text-highlight" />
              <DialogTitle className="text-white text-base font-bold tracking-tight">{titulo}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-zinc-400 text-left mt-1">
            {subtitulo}
          </DialogDescription>
        </DialogHeader>

        {/* ================= CORPO DO MODAL ================= */}
        <div className="py-2 flex-1 overflow-y-auto min-h-0 space-y-4">
          
          {/* MODO 1: CÂMERA AO VIVO COM MIRA 3X4 */}
          {mode === 'camera' && (
            <div className="space-y-4">
              {/* Container de Vídeo com Viewfinder 3x4 */}
              <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden border border-borderCustom flex items-center justify-center shadow-inner">
                {isInitializingCamera && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-highlight" />
                    <span className="text-xs text-zinc-300 font-medium">Iniciando câmera...</span>
                  </div>
                )}

                {cameraError ? (
                  <div className="p-6 text-center space-y-3 z-10">
                    <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                    <p className="text-xs text-zinc-300 leading-relaxed max-w-xs mx-auto">{cameraError}</p>
                    <Button 
                      type="button" 
                      onClick={() => startCamera(facingMode)}
                      className="bg-highlight text-background hover:bg-highlight/90 text-xs font-bold h-8 px-4 rounded-lg"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Elemento de Vídeo com Autofit */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    />

                    {/* MÁSCARA OVERLAY COM MIRA 3X4 (Viewfinder) */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                      {/* Fundo escurecido semitransparente ao redor */}
                      <div className="absolute inset-0 bg-black/45" />

                      {/* Caixa de Enquadramento 3x4 com cantos realçados */}
                      <div className="relative w-[180px] h-[240px] sm:w-[210px] sm:h-[280px] rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] border-2 border-highlight/90 overflow-hidden flex flex-col justify-between p-2">
                        {/* Cantoneiras douradas */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-highlight" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-highlight" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-highlight" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-highlight" />

                        {/* Linhas guias sutis de terços */}
                        <div className="absolute top-1/3 left-0 right-0 border-b border-highlight/20 border-dashed" />
                        <div className="absolute top-2/3 left-0 right-0 border-b border-highlight/20 border-dashed" />

                        {/* Rótulo de auxílio */}
                        <span className="text-[10px] uppercase font-bold text-highlight bg-black/70 px-2 py-0.5 rounded self-center shadow-sm">
                          Foto 3x4
                        </span>
                        <span className="text-[9px] text-zinc-300 text-center bg-black/70 px-1.5 py-0.5 rounded shadow-sm">
                          Alinhe a foto aqui
                        </span>
                      </div>
                    </div>

                    {/* Controles Flutuantes da Câmera (Lanterna e Alternar Câmera) */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-2 z-20">
                      {hasTorch && (
                        <button
                          type="button"
                          onClick={toggleTorch}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                            isTorchOn ? 'bg-amber-400 text-black' : 'bg-black/60 text-white hover:bg-black/80'
                          }`}
                          title="Alternar lanterna"
                        >
                          <Flashlight className="w-4 h-4" />
                        </button>
                      )}
                      {hasMultipleCameras && (
                        <button
                          type="button"
                          onClick={toggleCameraFacing}
                          className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                          title="Alternar câmera frontal/traseira"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Botão de Disparo / Shutter */}
              <div className="flex items-center justify-center pt-1">
                <Button
                  type="button"
                  onClick={handleCaptureFrame}
                  disabled={isInitializingCamera || Boolean(cameraError)}
                  className="bg-highlight text-background hover:bg-highlight/90 font-bold px-8 h-12 rounded-2xl text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-105 border-none disabled:opacity-50"
                >
                  <Camera className="w-5 h-5" />
                  Capturar Foto 3x4
                </Button>
              </div>
            </div>
          )}

          {/* MODO 2: PRÉ-VISUALIZAÇÃO & MICRO-AJUSTE FINO */}
          {mode === 'preview' && (
            <div className="space-y-4">
              {/* Moldura de Pré-visualização com Proporção 3x4 Fiel */}
              <div className="flex flex-col items-center">
                <div 
                  className="relative w-[180px] h-[240px] sm:w-[210px] sm:h-[280px] rounded-xl overflow-hidden bg-[#0d0d0f] border-2 border-highlight shadow-2xl cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {capturedImageRaw && (
                    <img
                      src={capturedImageRaw}
                      alt="Preview Foto"
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none transition-transform duration-75"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation + fineAngle}deg) scale(${zoom})`,
                        filter: `brightness(${brightness}%)${enhancedContrast ? ' contrast(125%) saturate(110%)' : ''}`
                      }}
                    />
                  )}

                  {/* Grade Guia de Alinhamento (Eyes Level) */}
                  <div className="absolute inset-0 pointer-events-none border border-highlight/30">
                    <div className="absolute top-[35%] left-0 right-0 border-b border-highlight/30 border-dashed" title="Linha dos olhos" />
                    <div className="absolute top-[75%] left-0 right-0 border-b border-highlight/30 border-dashed" title="Linha do queixo" />
                    <div className="absolute top-0 bottom-0 left-1/2 border-r border-highlight/30 border-dashed" title="Centro" />
                  </div>

                  {/* Dica sobreposta */}
                  <div className="absolute bottom-1.5 inset-x-2 text-center pointer-events-none">
                    <span className="text-[9px] font-semibold text-zinc-300 bg-black/75 px-2 py-0.5 rounded shadow">
                      Arraste para centralizar o rosto
                    </span>
                  </div>
                </div>
              </div>

              {/* PAINEL DE CONTROLES DE AJUSTE */}
              <div className="bg-[#18181b] p-3.5 rounded-xl border border-borderCustom space-y-3.5 text-xs">
                
                {/* 1. Zoom / Escala */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-zinc-400 font-medium">
                    <span className="flex items-center gap-1 text-[11px] text-zinc-300">
                      <ZoomIn className="w-3.5 h-3.5 text-highlight" />
                      Zoom / Aproximação
                    </span>
                    <span className="font-mono text-highlight text-[11px]">{zoom.toFixed(2)}x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ZoomOut className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <input
                      type="range"
                      min={1.0}
                      max={3.0}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                    />
                    <ZoomIn className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  </div>
                </div>

                {/* 2. Rotação Fina (Alinhamento Angular) e Girar 90° */}
                <div className="space-y-1.5 pt-1 border-t border-borderCustom/60">
                  <div className="flex items-center justify-between text-zinc-400 font-medium">
                    <span className="flex items-center gap-1 text-[11px] text-zinc-300">
                      <Sliders className="w-3.5 h-3.5 text-highlight" />
                      Alinhamento Angular (Micro-rotação)
                    </span>
                    <span className="font-mono text-highlight text-[11px]">
                      {fineAngle > 0 ? `+${fineAngle}°` : `${fineAngle}°`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={-15}
                      max={15}
                      step={0.5}
                      value={fineAngle}
                      onChange={(e) => setFineAngle(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-yellow-400 flex-1"
                    />
                    {/* Botões Girar 90° */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRotate90('ccw')}
                        className="h-7 w-7 p-0 bg-[#242427] border-borderCustom text-zinc-300 hover:text-white"
                        title="Girar 90° para esquerda"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRotate90('cw')}
                        className="h-7 w-7 p-0 bg-[#242427] border-borderCustom text-zinc-300 hover:text-white"
                        title="Girar 90° para direita"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 3. Brilho e Realce de Contraste (Fotos Antigas / Desbotadas) */}
                <div className="flex items-center justify-between pt-1 border-t border-borderCustom/60 gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-zinc-400 font-medium">
                      <span className="flex items-center gap-1 text-[11px] text-zinc-300">
                        <SunMedium className="w-3.5 h-3.5 text-highlight" />
                        Brilho
                      </span>
                      <span className="font-mono text-zinc-400 text-[10px]">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min={80}
                      max={135}
                      step={1}
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                    />
                  </div>

                  <Button
                    type="button"
                    variant={enhancedContrast ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEnhancedContrast(!enhancedContrast)}
                    className={`h-8 text-xs gap-1.5 px-3 rounded-lg cursor-pointer shrink-0 mt-3 ${
                      enhancedContrast 
                        ? 'bg-highlight text-background font-bold hover:bg-highlight/90' 
                        : 'bg-[#242427] border-borderCustom text-zinc-300 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Realce de Ficha
                  </Button>
                </div>
              </div>

              {/* Botões de Ação do Preview */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRecapture}
                  disabled={isProcessing}
                  className="bg-[#1a1a1a] border-borderCustom text-white hover:bg-hoverCustom cursor-pointer text-xs h-9 px-4 rounded-xl flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tirar Outra
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirmCrop}
                  disabled={isProcessing}
                  className="bg-highlight text-background hover:bg-highlight/90 font-bold px-6 h-9 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer border-none shadow-md"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirmar e Usar Foto
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
