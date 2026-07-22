'use client'

import React, { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PenTool, Trash2, RefreshCw, X, Check, Loader2, Smartphone } from 'lucide-react'
import { Button } from './button'
import { cn, urlToBase64 } from '@/lib/utils'
import { toast } from 'sonner'

interface SignaturePadProps {
  label: string
  value: string | null // A URL ou base64 da assinatura existente, se houver
  onChange: (base64: string | null) => void // Callback para retornar o base64
  isEditMode?: boolean
  globalSignatureUrl?: string | null
}

export function SignaturePad({ label, value, onChange, isEditMode = true, globalSignatureUrl }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [drawnPaths, setDrawnPaths] = useState<Array<Array<{ x: number; y: number }>>>([])
  const [mounted, setMounted] = useState(false)

  // Armazenar caminhos desenhados para redesenho no resize/rotação
  const currentPathRef = useRef<Array<{ x: number; y: number }>>([])

  // Registrar se o componente está montado (evita erros de SSR com portal)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Ajustar tamanho do canvas de acordo com o DPI/DPR
  const resizeCanvas = (canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    // Configura tamanho interno
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0033aa' // Caneta azul escuro
      ctx.lineWidth = 2.0 // Espessura ideal para assinatura
    }
  }

  // Redesenhar todos os caminhos salvos após redimensionamento
  const redrawPaths = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx || drawnPaths.length === 0) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0033aa'
    ctx.lineWidth = 2.0

    drawnPaths.forEach((path) => {
      if (path.length === 0) return
      ctx.beginPath()
      ctx.moveTo(path[0].x, path[0].y)
      if (path.length === 1) {
        ctx.lineTo(path[0].x, path[0].y)
      } else {
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y)
        }
      }
      ctx.stroke()
    })
  }

  // Efeito para redimensionar e monitorar o canvas dentro do modal
  useEffect(() => {
    if (!isModalOpen) return

    const canvas = canvasRef.current
    if (!canvas) return

    // Ajustar tamanho inicial
    resizeCanvas(canvas)
    redrawPaths(canvas)

    // ResizeObserver para monitorar mudanças de container
    const resizeObserver = new ResizeObserver(() => {
      if (canvas) {
        resizeCanvas(canvas)
        redrawPaths(canvas)
      }
    })

    const parent = canvas.parentElement
    if (parent) resizeObserver.observe(parent)

    return () => {
      resizeObserver.disconnect()
    }
  }, [isModalOpen, drawnPaths])

  // Capturar coordenadas relativas
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    
    let clientX = 0
    let clientY = 0

    if ('touches' in e) {
      if (e.touches.length === 0) return null
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isEditMode) return
    const canvas = canvasRef.current
    if (!canvas) return

    const coords = getCoordinates(e, canvas)
    if (!coords) return

    // Prevenir scrolling no mobile
    if (e.cancelable) e.preventDefault()

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(coords.x, coords.y)
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
      setIsDrawing(true)
      
      currentPathRef.current = [coords]
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isEditMode) return
    const canvas = canvasRef.current
    if (!canvas) return

    const coords = getCoordinates(e, canvas)
    if (!coords) return

    // Prevenir scrolling no mobile
    if (e.cancelable) e.preventDefault()

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
      
      currentPathRef.current.push(coords)
    }
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    setHasSignature(true)

    // Adiciona o caminho recém desenhado à lista histórica para restauração no resize
    if (currentPathRef.current.length > 0) {
      const newPaths = [...drawnPaths, currentPathRef.current]
      setDrawnPaths(newPaths)
      currentPathRef.current = []
    }
  }

  // Recorte Inteligente (Auto-Crop) com rotação automática de 90° se for mais alta que larga no mobile
  const getCroppedBase64 = (): string | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Lê os dados de pixels
    const w = canvas.width
    const h = canvas.height
    const dpr = window.devicePixelRatio || 1
    const imgData = ctx.getImageData(0, 0, w, h)
    const data = imgData.data

    let minX = w
    let minY = h
    let maxX = 0
    let maxY = 0
    let hasPixels = false

    // Varre matriz analisando opacidade (canal Alpha)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3]
        if (alpha > 10) { // Encontrou pixel de assinatura
          if (x < minX) minX = x
          if (y < minY) minY = y
          if (x > maxX) maxX = x
          if (y > maxY) maxY = y
          hasPixels = true
        }
      }
    }

    if (!hasPixels) return null

    // Adicionar margem de segurança de 6px convertida com base no DPI
    const padding = Math.round(6 * dpr)
    minX = Math.max(0, minX - padding)
    minY = Math.max(0, minY - padding)
    maxX = Math.min(w, maxX + padding)
    maxY = Math.min(h, maxY + padding)

    const cropW = maxX - minX
    const cropH = maxY - minY

    if (cropW <= 0 || cropH <= 0) return null

    // Se no mobile a assinatura desenhada for mais ALTA do que LARGA (escreveu de cima pra baixo no celular em pé),
    // nós rotacionamos ela em 90 graus no sentido horário (+90deg) para ficar perfeitamente na horizontal!
    const shouldRotate = isPortraitMobile && cropH > cropW * 1.1

    const tempCanvas = document.createElement('canvas')
    
    if (shouldRotate) {
      // Quando rotaciona 90 graus, a nova largura vira a antiga altura
      tempCanvas.width = cropH
      tempCanvas.height = cropW
      const tempCtx = tempCanvas.getContext('2d')
      if (tempCtx) {
        // Translada e rotaciona +90 graus (sentido horário)
        tempCtx.translate(cropH, 0)
        tempCtx.rotate(Math.PI / 2)
        
        // Extrai a área desenhada
        const subData = ctx.getImageData(minX, minY, cropW, cropH)
        const rawCropCanvas = document.createElement('canvas')
        rawCropCanvas.width = cropW
        rawCropCanvas.height = cropH
        const rawCtx = rawCropCanvas.getContext('2d')
        if (rawCtx) {
          rawCtx.putImageData(subData, 0, 0)
          tempCtx.drawImage(rawCropCanvas, 0, 0)
          return tempCanvas.toDataURL('image/png')
        }
      }
    } else {
      tempCanvas.width = cropW
      tempCanvas.height = cropH
      const tempCtx = tempCanvas.getContext('2d')
      if (tempCtx) {
        tempCtx.putImageData(ctx.getImageData(minX, minY, cropW, cropH), 0, 0)
        return tempCanvas.toDataURL('image/png')
      }
    }

    return null
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setDrawnPaths([])
      setHasSignature(false)
    }
  }

  const handleOpenModal = () => {
    if (!isEditMode) return
    setDrawnPaths([])
    setHasSignature(false)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
  }

  const handleConfirm = () => {
    const cropped = getCroppedBase64()
    if (cropped) {
      onChange(cropped)
    } else {
      onChange(null)
    }
    setIsModalOpen(false)
  }

  // Detectar orientação portrait no mobile
  const [isPortraitMobile, setIsPortraitMobile] = useState(false)

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth < 768
      const isVert = window.innerHeight > window.innerWidth
      setIsPortraitMobile(isMobile && isVert)
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    return () => window.removeEventListener('resize', checkOrientation)
  }, [])

  // Classes css do container do modal
  const modalClasses = "w-[96vw] max-w-[750px] h-[90vh] max-h-[520px] bg-[#121214] border border-[#26262a] rounded-2xl p-4 sm:p-6 flex flex-col justify-between shadow-2xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-[#3ea6ff]" />
          {label}
        </label>
        
        {isEditMode && globalSignatureUrl && (
          <Button
            type="button"
            variant="outline"
            onClick={async (e) => {
              e.stopPropagation()
              const toastId = toast.loading('Carregando assinatura pessoal...')
              try {
                const base64 = await urlToBase64(globalSignatureUrl)
                onChange(base64)
                toast.success('Assinatura pessoal carregada com sucesso!', { id: toastId })
              } catch (err) {
                console.error(err)
                toast.error('Erro ao carregar assinatura pessoal.', { id: toastId })
              }
            }}
            className="h-7 px-2.5 bg-[#185FA5]/10 hover:bg-[#185FA5]/20 text-[#3ea6ff] border-[#3ea6ff]/20 text-[10px] font-bold rounded-lg uppercase flex items-center gap-1 cursor-pointer"
          >
            <PenTool className="w-3 h-3 text-[#3ea6ff]" />
            G - Usar Salva
          </Button>
        )}
      </div>

      <div
        onClick={handleOpenModal}
        className={cn(
          "relative border border-[#2a2a2a] rounded-xl overflow-hidden bg-white aspect-[3/1] min-h-[90px] flex items-center justify-center transition-all duration-200",
          isEditMode ? "cursor-pointer hover:border-[#3ea6ff]/40 hover:bg-[#f4f4f5] active:scale-[0.99]" : ""
        )}
      >
        {value ? (
          <div className="p-3 w-full h-full flex flex-col items-center justify-center">
            <img
              src={value.startsWith('data:') ? value : `${value}${value.includes('?') ? '&' : '?'}t=${Date.now()}`}
              alt={`Assinatura ${label}`}
              className="max-h-[75px] w-auto object-contain select-none pointer-events-none"
            />
            {isEditMode && (
              <span className="absolute bottom-2 right-2 text-[10px] text-[#185fa5] dark:text-[#3ea6ff] font-medium flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" />
                Alterar
              </span>
            )}
          </div>
        ) : (
          <div className="p-4 w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-1.5">
            <PenTool className="w-5 h-5 text-zinc-500" />
            <span className="text-xs font-medium">Toque para Assinar</span>
          </div>
        )}
      </div>

      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center overflow-hidden p-2 sm:p-4">
          <div className={modalClasses}>
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#26262a] pb-3 mb-2">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-[#3ea6ff]" />
                  {label}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {isPortraitMobile
                    ? 'Escreva na vertical com espaço total. O sistema ajusta e desentorta a assinatura automaticamente!'
                    : 'Desenhe sua assinatura no quadro abaixo.'}
                </p>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 min-h-0 relative bg-white rounded-xl overflow-hidden border border-zinc-300 shadow-inner flex items-center justify-center">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full cursor-crosshair touch-none"
              />
              {!hasSignature && (
                <div className="absolute pointer-events-none text-zinc-300 text-sm select-none border border-dashed border-zinc-300 px-4 py-2 rounded-lg">
                  Assine aqui
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-[#26262a] mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="text-zinc-400 hover:text-white border border-[#27272a] rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
              >
                Fechar
              </Button>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clear}
                  disabled={!hasSignature}
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl h-10 px-4 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Apagar
                </Button>
                
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!hasSignature}
                  className="bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#09090b] font-bold rounded-xl h-10 px-5 text-xs flex items-center gap-1.5 shadow-md shadow-[#3ea6ff]/10 disabled:opacity-40 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
