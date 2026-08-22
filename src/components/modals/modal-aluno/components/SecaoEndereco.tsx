'use client'

import React from 'react'
import { useAlunoForm } from '../context/AlunoFormContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MiniMapa } from '@/components/map/MapWrapper'
import { Loader2, Search, MapPin, Navigation } from 'lucide-react'
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
    isFetchingCep,
    consultarCep
  } = useAlunoForm()

  return (
    <div className="space-y-6 py-2">
      {/* 1. Endereço Residencial Detalhado */}
      <div className="p-4 rounded-xl bg-background border border-borderCustom space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-borderCustom text-highlight font-bold text-xs uppercase tracking-wider">
          <MapPin className="w-4 h-4 text-highlight" />
          Endereço Residencial do Estudante
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Rua / Logradouro</Label>
              <Input 
                value={rua} 
                onChange={(e) => setRua(e.target.value)} 
                onBlur={() => setRua(formatNameTitleCase(rua))}
                placeholder="Ex: Rua do Brito" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Número</Label>
              <Input 
                value={numero} 
                onChange={(e) => setNumero(e.target.value)} 
                placeholder="78" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground font-medium">CEP</Label>
                {isFetchingCep && (
                  <span className="text-[10px] text-highlight flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                  </span>
                )}
              </div>
              <div className="relative">
                <Input 
                  value={cep} 
                  onChange={(e) => setCep(e.target.value)} 
                  placeholder="00000-000" 
                  className="h-8 bg-[#181818] border-borderCustom text-xs pr-8" 
                />
                <button
                  type="button"
                  onClick={() => consultarCep && consultarCep()}
                  disabled={isFetchingCep}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-highlight transition-colors cursor-pointer"
                  title="Consultar CEP nos Correios"
                >
                  {isFetchingCep ? <Loader2 className="w-3.5 h-3.5 animate-spin text-highlight" /> : <Search className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Bairro / Localidade</Label>
              <Input 
                value={bairro} 
                onChange={(e) => setBairro(e.target.value)} 
                onBlur={() => setBairro(formatNameTitleCase(bairro))}
                placeholder="Brito" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Cidade</Label>
              <Input 
                value={cidadeEnd} 
                onChange={(e) => setCidadeEnd(e.target.value)} 
                onBlur={() => setCidadeEnd(formatNameTitleCase(cidadeEnd))}
                placeholder="Sapeaçu" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">UF</Label>
              <Input 
                value={ufEnd} 
                maxLength={2}
                onChange={(e) => setUfEnd(e.target.value.toUpperCase())} 
                placeholder="BA" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Localização da Residência</Label>
              <Select value={areaLocalizacao} onValueChange={(val) => setAreaLocalizacao(val || 'Urbana')}>
                <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                  <SelectItem value="Urbana">Urbana</SelectItem>
                  <SelectItem value="Rural">Rural</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Área Diferenciada</Label>
              <Select value={areaDiferenciada} onValueChange={(val) => setAreaDiferenciada(val || 'Não está em área diferenciada')}>
                <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                  <SelectItem value="Não está em área diferenciada">Não está em área diferenciada</SelectItem>
                  <SelectItem value="Área de assentamento">Área de assentamento</SelectItem>
                  <SelectItem value="Terra indígena">Terra indígena</SelectItem>
                  <SelectItem value="Comunidade remanescente de quilombos">Comunidade quilombola</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Georreferenciamento & Mini Mapa */}
      <div className="p-4 rounded-xl bg-background border border-borderCustom space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-borderCustom text-highlight font-bold text-xs uppercase tracking-wider">
          <Navigation className="w-4 h-4 text-highlight" />
          Geolocalização Residencial
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Latitude</Label>
              <Input 
                type="number"
                step="any"
                value={latitude !== null ? latitude : ''} 
                onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)} 
                placeholder="-12.987654" 
                className="h-8 bg-[#181818] border-borderCustom text-xs font-mono" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Longitude</Label>
              <Input 
                type="number"
                step="any"
                value={longitude !== null ? longitude : ''} 
                onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)} 
                placeholder="-38.123456" 
                className="h-8 bg-[#181818] border-borderCustom text-xs font-mono" 
              />
            </div>
          </div>

          <div className="h-44 w-full rounded-xl overflow-hidden border border-borderCustom">
            <MiniMapa 
              initialLat={latitude ?? undefined} 
              initialLng={longitude ?? undefined} 
              onCoordinatesChange={(lat: number, lng: number) => {
                setLatitude(lat)
                setLongitude(lng)
              }} 
              address={rua ? `${rua}, ${numero || 'S/N'}, ${bairro || ''}, ${cidadeEnd || ''}` : ''}
              onAddressChange={(val: string) => setRua(val)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
