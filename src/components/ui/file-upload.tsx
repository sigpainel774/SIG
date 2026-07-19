"use client"

import React, { useRef, useState, useEffect } from "react"
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface FileUploadProps {
  accept?: string
  maxSizeMB?: number
  file: File | null
  onChange: (file: File | null) => void
  label?: string
  previewUrl?: string | null
  className?: string
}

export function FileUpload({
  accept = ".pdf,image/*",
  maxSizeMB = 5,
  file,
  onChange,
  label = "Selecione ou arraste um arquivo",
  previewUrl,
  className,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Sincronizar ou gerar preview local se for imagem
  useEffect(() => {
    if (!file) {
      setLocalPreview(null)
      return
    }

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file)
      setLocalPreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setLocalPreview(null)
    }
  }, [file])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    if (selectedFile) {
      if (selectedFile.size > maxSizeMB * 1024 * 1024) {
        alert(`O arquivo não pode exceder ${maxSizeMB}MB.`)
        return
      }
    }
    onChange(selectedFile)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files?.[0] || null
    if (droppedFile) {
      if (droppedFile.size > maxSizeMB * 1024 * 1024) {
        alert(`O arquivo não pode exceder ${maxSizeMB}MB.`)
        return
      }
      onChange(droppedFile)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const activePreview = localPreview || previewUrl
  const isImage = file ? file.type.startsWith("image/") : (previewUrl ? /\.(jpg|jpeg|png|webp|gif)/i.test(previewUrl) : false)

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "relative flex flex-col items-center justify-center p-4 border border-dashed rounded-xl cursor-pointer transition-all min-h-[110px]",
        isDragOver 
          ? "border-[#3ea6ff] bg-[#3ea6ff]/10" 
          : "border-[#3f3f46] bg-[#18181b] hover:bg-[#202024]",
        className
      )}
    >
      <Input
        type="file"
        ref={fileInputRef}
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {file || previewUrl ? (
        <div className="flex items-center gap-3 w-full">
          {isImage && activePreview ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#121212] shrink-0">
              <img src={activePreview} alt="Preview" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-[#27272a] flex items-center justify-center border border-[#3f3f46] text-zinc-400 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {file ? file.name : "Arquivo Anexado"}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Visualizar/Alterar arquivo"}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center text-zinc-400 select-none">
          <Upload className="w-5 h-5 text-zinc-500" />
          <span className="text-xs font-medium">{label}</span>
          <span className="text-[10px] text-zinc-500">PDF ou Imagem até {maxSizeMB}MB</span>
        </div>
      )}
    </div>
  )
}
