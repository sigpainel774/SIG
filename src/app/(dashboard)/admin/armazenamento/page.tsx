'use client'

import { HardDrive, RefreshCw, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useAdminStorage } from '@/hooks/useAdminStorage'

import { StorageBreakdown } from './components/StorageBreakdown'
import { StorageBySchoolTable } from './components/StorageBySchoolTable'
import { StorageFileInspector } from './components/StorageFileInspector'

// Helper para formatar tamanho de arquivos
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export default function AdminArmazenamentoPage() {
  const {
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
  } = useAdminStorage()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner label="Analisando volumes e medindo espaço em disco..." />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto gap-4">
        <ShieldAlert className="w-12 h-12 text-rose-500" />
        <h3 className="text-white font-bold text-lg">Erro ao processar dados</h3>
        <p className="text-[#8e8e93] text-sm">
          Não foi possível conectar ao storage do Supabase. Verifique suas políticas de acesso ou tente novamente.
        </p>
        <Button onClick={() => loadStorageData()} className="mt-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Armazenamento do Servidor"
        description="Análise detalhada do uso do Supabase Storage por escolas, buckets e formatos."
        icon={HardDrive}
        iconVariant="primary"
        backHref="/admin"
        actions={
          <Button
            onClick={() => loadStorageData(true)}
            disabled={refreshing}
            variant="outline"
            className="border-[#2a2a2a] hover:bg-[#272727] text-white cursor-pointer h-10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Sincronizando...' : 'Atualizar Dados'}
          </Button>
        }
      />

      {/* Métricas Principais (Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#121214] border-[#232326] rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">
              Armazenamento Total
            </CardDescription>
            <CardTitle className="text-2xl font-black text-white mt-1">
              {formatBytes(data.totalBytes)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#8e8e93]">Espaço ocupado por toda a rede municipal.</p>
          </CardContent>
        </Card>

        <Card className="bg-[#121214] border-[#232326] rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">
              Rede Compartilhada
            </CardDescription>
            <CardTitle className="text-2xl font-black text-sky-400 mt-1">
              {formatBytes(data.sharedBytes)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#8e8e93]">
              Logos, murais e anexos de comunicados globais.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#121214] border-[#232326] rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">
              Total de Arquivos
            </CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-400 mt-1">
              {data.totalFileCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#8e8e93]">Arquivos cadastrados nos buckets públicos.</p>
          </CardContent>
        </Card>

        <Card className="bg-[#121214] border-[#232326] rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">
              Eficiência e Custo
            </CardDescription>
            <CardTitle className="text-2xl font-black text-purple-400 mt-1">
              {((data.totalBytes / (5 * 1024 * 1024 * 1024)) * 100).toFixed(2)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#8e8e93]">Consumido do limite padrão grátis de 5 GB.</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição Visual por Formato */}
      <StorageBreakdown
        totalBytes={data.totalBytes}
        percentages={typeBreakdownPercentages}
      />

      {/* Consumo por Unidades Escolares */}
      <StorageBySchoolTable data={data} />

      {/* Inspetor de Arquivos */}
      <StorageFileInspector
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedSchool={selectedSchool}
        setSelectedSchool={setSelectedSchool}
        selectedBucket={selectedBucket}
        setSelectedBucket={setSelectedBucket}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        sortBy={sortBy}
        setSortBy={setSortBy}
        bySchool={data.bySchool}
        bucketsList={bucketsList}
        filteredFiles={filteredFiles}
        totalFilesCount={data.topFiles.length}
      />
    </div>
  )
}
