'use client'

import React from 'react'
import { useAlunoForm } from '../context/AlunoFormContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MiniMapa } from '@/components/map/MapWrapper'
import { Loader2, Search } from 'lucide-react'
import { formatNameTitleCase } from '@/lib/stringUtils'

export function SecaoEndereco() {
  const {
    rua, setRua,
    numero, setNumero,
    cep, setCep,
    bairro, setBairro,
    cidadeEnd, setCidadeEnd,
    ufEnd, setUfEnd,
    areaLocalizacao, setAreaLocalizacao,
    areaDiferenciada, setAreaDiferenciada,
    latitude, setLatitude,
    longitude, setLongitude,
    endereco, setEndereco,
    isFetchingCep,
    consultarCep
  } = useAlunoForm()

  return (
    <div className="student-edit-modal__section student-section-card p-5 rounded-xl bg-white border border-[#D1D5DB]">
      <div className="student-edit-modal__section-title section-title text-[#0067C0] font-bold text-base tracking-[0.01em] pb-2.5 mb-3 border-b border-[#D1D5DB]">
        7. Endereço Residencial Detalhado
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3">
            <Label className="text-xs text-muted-foreground font-medium">Rua / Logradouro</Label>
            <Input 
              value={rua} 
              onChange={(e) => setRua(e.target.value)} 
              onBlur={() => setRua(formatNameTitleCase(rua))}
              placeholder="Rua do Brito" 
              className="mt-1" 
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-medium">Nº</Label>
            <Input 
              value={numero} 
              onChange={(e) => setNumero(e.target.value)} 
              placeholder="78" 
              className="mt-1" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-medium">CEP</Label>
              {isFetchingCep && (
                <span className="text-[10px] text-primary flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                </span>
              )}
            </div>
            <div className="relative mt-1">
              <Input 
                value={cep} 
                onChange={(e) => setCep(e.target.value)} 
                placeholder="" 
                className="pr-8" 
              />
              <button
                type="button"
                onClick={() => consultarCep && consultarCep()}
                disabled={isFetchingCep}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                title="Consultar CEP nos Correios"
              >
                {isFetchingCep ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Search className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-medium">Bairro / Localidade</Label>
            <Input 
              value={bairro} 
              onChange={(e) => setBairro(e.target.value)} 
              onBlur={() => setBairro(formatNameTitleCase(bairro))}
              placeholder="Brito" 
              className="mt-1" 
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-medium">Cidade</Label>

            <Input 
              value={cidadeEnd} 
              onChange={(e) => setCidadeEnd(e.target.value)} 
              onBlur={() => setCidadeEnd(formatNameTitleCase(cidadeEnd))}
              placeholder="SAPE AÇU" 
              className="mt-1" 
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-medium">UF</Label>
            <Input 
              value={ufEnd} 
              maxLength={2}
              onChange={(e) => setUfEnd(e.target.value.toUpperCase())} 
              placeholder="BA" 
              className="mt-1" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground font-medium">Área de localização da residência</Label>
            <Select value={areaLocalizacao} onValueChange={(val) => setAreaLocalizacao(val || 'Urbana')}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Urbana">Urbana</SelectItem>
                <SelectItem value="Rural">Rural</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground font-medium">Residência em Área Diferenciada?</Label>
            <Select value={areaDiferenciada} onValueChange={(val) => setAreaDiferenciada(val || 'Não está em área diferenciada')}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Não está em área diferenciada">Não está em área diferenciada</SelectItem>
                <SelectItem value="Área quilombola">Área quilombola</SelectItem>
                <SelectItem value="Terra indígena">Terra indígena</SelectItem>
                <SelectItem value="Área de assentamento">Área de assentamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Seleção de GPS por Mapa - print:hidden */}
        <div className="print:hidden mt-4">
          <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">Coordenadas de GPS (Arraste o pin ou clique no mapa para selecionar)</Label>
          <div className="mt-1 w-full relative z-10">
            <MiniMapa
              initialLat={latitude ?? undefined}
              initialLng={longitude ?? undefined}
              onCoordinatesChange={(lat, lng) => {
                setLatitude(lat)
                setLongitude(lng)
              }}
              address={rua ? `${rua}, ${numero || ''}, ${bairro || ''}, ${cidadeEnd || ''} - ${ufEnd || ''}` : endereco}
              onAddressChange={(val) => {
                setEndereco(val)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

