'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useLocalSearch } from '@/hooks/useLocalSearch'
import { toast } from 'sonner'

export interface SchoolStat {
  escolaId: string
  escolaNome: string
  totalBytes: number
  fileCount: number
  breakdown: { images: number; docs: number; videos: number; others: number }
}

export interface MappedFile {
  id: string
  name: string
  bucketId: string
  size: number
  mimetype: string
  createdAt: string
  escolaId: string | null
  escolaNome: string
  type: 'images' | 'docs' | 'videos' | 'others'
}

export interface StorageData {
  totalBytes: number
  sharedBytes: number
  sharedFileCount: number
  sharedBreakdown: { images: number; docs: number; videos: number; others: number }
  totalFileCount: number
  bySchool: SchoolStat[]
  topFiles: MappedFile[]
}

export function useAdminStorage() {
  const router = useRouter()
  const { funcionario } = useAuthStore()

  // Estados dos dados e de carregamento
  const [data, setData] = useState<StorageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Estados dos filtros do inspetor de arquivos
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSchool, setSelectedSchool] = useState<string>('ALL')
  const [selectedBucket, setSelectedBucket] = useState<string>('ALL')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'size' | 'date'>('size')

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadStorageData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/admin/armazenamento')
      if (!res.ok) {
        if (res.status === 403) {
          toast.error('Sem permissão de acesso.')
          router.push('/home')
          return
        }
        throw new Error('Falha ao consultar armazenamento')
      }
      const json = await res.json()
      
      if (!isMounted.current) return
      
      setData(json)
      if (isRefresh) {
        toast.success('Dados de armazenamento atualizados!')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao carregar metadados de armazenamento.')
    } finally {
      if (isMounted.current) {
        if (!isRefresh) setLoading(false)
        setRefreshing(false)
      }
    }
  }

  // Carga inicial vinculada ao funcionário
  useEffect(() => {
    if (!funcionario) return 
    if (!funcionario.is_superadmin) {
      toast.error('Acesso restrito a administradores ROOT.')
      router.push('/home')
      return
    }
    loadStorageData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionario])

  // Lista única de buckets para filtro
  const bucketsList = useMemo(() => {
    if (!data?.topFiles) return []
    const set = new Set<string>()
    data.topFiles.forEach(f => set.add(f.bucketId))
    return Array.from(set).sort()
  }, [data])

  const searchedFiles = useLocalSearch(data?.topFiles || [], searchTerm, ['name'])

  // Filtrar e ordenar arquivos do inspetor de arquivos
  const filteredFiles = useMemo(() => {
    return searchedFiles
      .filter(file => {
        const schoolMatch =
          selectedSchool === 'ALL' ||
          (selectedSchool === 'SHARED' && file.escolaId === null) ||
          file.escolaId === selectedSchool
        const bucketMatch = selectedBucket === 'ALL' || file.bucketId === selectedBucket
        const typeMatch = selectedType === 'ALL' || file.type === selectedType

        return schoolMatch && bucketMatch && typeMatch
      })
      .sort((a, b) => {
        if (sortBy === 'size') {
          return b.size - a.size
        } else {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
      })
  }, [searchedFiles, selectedSchool, selectedBucket, selectedType, sortBy])

  // Calcular percentuais para a barra de progresso empilhada global
  const typeBreakdownPercentages = useMemo(() => {
    if (!data || data.totalBytes === 0) {
      return { 
        images: 0, 
        docs: 0, 
        videos: 0, 
        others: 0,
        imagesBytes: 0,
        docsBytes: 0,
        videosBytes: 0,
        othersBytes: 0 
      }
    }
    
    let imagesSum = data.sharedBreakdown.images
    let docsSum = data.sharedBreakdown.docs
    let videosSum = data.sharedBreakdown.videos
    let othersSum = data.sharedBreakdown.others

    data.bySchool.forEach(s => {
      imagesSum += s.breakdown.images
      docsSum += s.breakdown.docs
      videosSum += s.breakdown.videos
      othersSum += s.breakdown.others
    })

    const total = data.totalBytes

    return {
      images: (imagesSum / total) * 100,
      docs: (docsSum / total) * 100,
      videos: (videosSum / total) * 100,
      others: (othersSum / total) * 100,
      imagesBytes: imagesSum,
      docsBytes: docsSum,
      videosBytes: videosSum,
      othersBytes: othersSum
    }
  }, [data])

  return {
    data,
    loading,
    refreshing,
    searchTerm,
    setSearchTerm,
    selectedSchool,
    setSelectedSchool,
    selectedBucket,
    setSelectedBucket,
    selectedType,
    setSelectedType,
    sortBy,
    setSortBy,
    bucketsList,
    filteredFiles,
    typeBreakdownPercentages,
    loadStorageData
  }
}
