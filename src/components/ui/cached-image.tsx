'use client'

import { useState, useEffect, useRef } from 'react'
import { obterFotoCache } from '@/lib/photoCache'

interface CachedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null
  alt: string
  className?: string
  fallback?: React.ReactNode
  updatedAt?: string | Date | number | null
}

export function CachedImage({
  src,
  alt,
  className = '',
  fallback = null,
  updatedAt,
  ...props
}: CachedImageProps) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null)
  const [carregando, setCarregando] = useState<boolean>(true)
  const [erro, setErro] = useState<boolean>(false)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true

    if (!src) {
      setDisplaySrc(null)
      setCarregando(false)
      setErro(true)
      return
    }

    setCarregando(true)
    setErro(false)

    let active = true

    obterFotoCache(src, updatedAt)
      .then((cachedUrl) => {
        if (active && isMounted.current) {
          setDisplaySrc(cachedUrl)
          setCarregando(false)
        }
      })
      .catch((err) => {
        console.warn('[CachedImage] Erro ao carregar foto do cache:', err)
        if (active && isMounted.current) {
          setDisplaySrc(src)
          setCarregando(false)
        }
      })

    return () => {
      active = false
      isMounted.current = false
    }
  }, [src, updatedAt])

  if (erro || (!carregando && !displaySrc)) {
    return <>{fallback}</>
  }

  return (
    <div className={`relative inline-block overflow-hidden ${className}`}>
      {carregando && fallback && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1a1a1e]">
          {fallback}
        </div>
      )}
      {displaySrc && (
        <img
          src={displaySrc}
          alt={alt}
          onError={() => {
            if (isMounted.current) {
              if (src && displaySrc !== src) {
                // Tenta fallback direto para a URL remota original
                setDisplaySrc(src)
              } else {
                setErro(true)
                setCarregando(false)
              }
            }
          }}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            carregando ? 'opacity-0' : 'opacity-100'
          }`}
          {...props}
        />
      )}
    </div>
  )
}
