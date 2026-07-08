'use client'

import React, { useRef, useState, useEffect } from 'react'
import { PenTool, Trash2, RefreshCw } from 'lucide-react'
import { Button } from './button'

interface SignaturePadProps {
  label: string
  value: string | null // A URL da assinatura existente, se houver
  onChange: (base64: string | null) => void // Callback para retornar o base64
  isEditMode?: boolean
}

export function SignaturePad({ label, value, onChange, isEditMode = true }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [showCanvas, setShowCanvas] = useState(!value)
  const [drawnPaths, setDrawnPaths] = useState<Array<Array<{ x: number; y: number }>>>([])

  // Armazenar caminhos desenhados para redesenho no resize/rotação
  const currentPathRef = useRef<Array<{ x: number; y: number }>>([])

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
      ctx.lineWidth = 1.5 // Espessura esferográfica
    }
  }

  // Redesenhar todos os caminhos salvos após redimensionamento
  const redrawPaths = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx || drawnPaths.length === 0) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawnPaths.forEach((path) => {
      if (path.length === 0) return
      ctx.beginPath()
      ctx.moveTo(path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y)
      }
      ctx.stroke()
    })
  }

  useEffect(() => {
    if (!showCanvas) return

    const canvas = canvasRef.current
    if (!canvas) return

    resizeCanvas(canvas)
    redrawPaths(canvas)

    // ResizeObserver para monitorar mudanças de orientação e tela
    const resizeObserver = new ResizeObserver(() => {
      if (canvas) {
        // Salva uma cópia temporária do canvas antes do resize se não houver drawnPaths estruturados
        resizeCanvas(canvas)
        redrawPaths(canvas)
      }
    })

    const parent = canvas.parentElement
    if (parent) resizeObserver.observe(parent)

    return () => {
      resizeObserver.disconnect()
    }
  }, [showCanvas, drawnPaths])

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
      
      // Gera o crop e notifica a mudança
      triggerCrop()
    }
  }

  // Recorte Inteligente (Auto-Crop)
  const triggerCrop = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

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

    if (!hasPixels) {
      onChange(null)
      return
    }

    // Adicionar margem de segurança de 6px convertida com base no DPI
    const padding = Math.round(6 * dpr)
    minX = Math.max(0, minX - padding)
    minY = Math.max(0, minY - padding)
    maxX = Math.min(w, maxX + padding)
    maxY = Math.min(h, maxY + padding)

    const cropW = maxX - minX
    const cropH = maxY - minY

    if (cropW <= 0 || cropH <= 0) {
      onChange(null)
      return
    }

    // Cria canvas temporário para o recorte
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = cropW
    tempCanvas.height = cropH
    const tempCtx = tempCanvas.getContext('2d')

    if (tempCtx) {
      // Desenha o trecho recortado no novo canvas
      tempCtx.putImageData(ctx.getImageData(minX, minY, cropW, cropH), 0, 0)
      const croppedBase64 = tempCanvas.toDataURL('image/png')
      onChange(croppedBase64)
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setDrawnPaths([])
      setHasSignature(false)
      onChange(null)
    }
  }

  const handleEditAgain = () => {
    setShowCanvas(true)
    setHasSignature(false)
    setDrawnPaths([])
    onChange(null)
  }

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-[#3ea6ff]" />
          {label}
        </label>
        {isEditMode && showCanvas && hasSignature && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="text-xs text-rose-400 hover:text-rose-300 h-7 px-2 hover:bg-rose-500/10 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Limpar
          </Button>
        )}
      </div>

      <div className="relative border border-[#2a2a2a] rounded-xl overflow-hidden bg-[#0d0d0f] aspect-[3/1] min-h-[90px] flex items-center justify-center">
        {showCanvas ? (
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
            style={{ display: 'block' }}
          />
        ) : (
          <div className="p-3 w-full h-full flex flex-col items-center justify-center bg-[#141416]">
            {value ? (
              <img
                src={value}
                alt={`Assinatura ${label}`}
                className="max-h-[75px] w-auto object-contain select-none pointer-events-none filter brightness-90 invert-[0.1]"
              />
            ) : (
              <span className="text-xs text-gray-500">Nenhuma assinatura registrada</span>
            )}
            {isEditMode && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleEditAgain}
                className="absolute top-2 right-2 text-[10px] text-[#3ea6ff] hover:text-[#3ea6ff]/80 h-6 px-1.5 hover:bg-[#3ea6ff]/10 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Alterar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
