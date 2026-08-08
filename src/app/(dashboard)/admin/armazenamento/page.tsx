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
        <h3 className="text-lg font-bold text-foreground">Erro ao processar dados</h3>
        <p className="text-sm text-muted-foreground">
          Não foi possível conectar ao storage do Supabase. Verifique suas políticas de acesso ou tente novamente.
        </p>
        <Button onClick={() => loadStorageData()} className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90">
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
            className="h-10 cursor-pointer border-border text-foreground hover:bg-muted"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Sincronizando...' : 'Atualizar Dados'}
          </Button>
        }
      />

      {/* Métricas Principais (Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Armazenamento Total
            </CardDescription>
            <CardTitle className="mt-1 text-2xl font-black text-foreground">
              {formatBytes(data.totalBytes)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Espaço ocupado por toda a rede municipal.</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rede Compartilhada
            </CardDescription>
            <CardTitle className="mt-1 text-2xl font-black text-sky-600 dark:text-sky-400">
              {formatBytes(data.sharedBytes)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Logos, murais e anexos de comunicados globais.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Arquivos
            </CardDescription>
            <CardTitle className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {data.totalFileCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Arquivos cadastrados nos buckets públicos.</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Eficiência e Custo
            </CardDescription>
            <CardTitle className="mt-1 text-2xl font-black text-violet-600 dark:text-purple-400">
              {((data.totalBytes / (5 * 1024 * 1024 * 1024)) * 100).toFixed(2)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Consumido do limite padrão grátis de 5 GB.</p>
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
