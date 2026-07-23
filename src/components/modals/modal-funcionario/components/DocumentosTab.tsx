'use client'

import React, { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { MiniMapa } from '@/components/map/MapWrapper'
import { useFuncionarioForm } from '../context/FuncionarioFormContext'
import { Loader2, Search, Navigation } from 'lucide-react'
import { toast } from 'sonner'

export function DocumentosTab() {
  const {
    cpf, setCpf,
    isCpfValid,
    isFetchingCep,
    consultarCep,
    rg, setRg,
    nis, setNis,
    logradouro, setLogradouro,
    numero, setNumero,
    cep, setCep,
    bairro, setBairro,
    cidade, setCidade,
    ufResidencia, setUfResidencia,
    areaResidencia, setAreaResidencia,
    areaDiferenciada, setAreaDiferenciada,
    latitude, setLatitude,
    longitude, setLongitude,
    latitudeStr, setLatitudeStr,
    longitudeStr, setLongitudeStr,
    formatCPF,
    formatCEP,
  } = useFuncionarioForm()

  const [capturandoGps, setCapturandoGps] = useState(false)

  const handleCapturarGpsAtual = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocalização não é suportada por este navegador.')
      return
    }

    setCapturandoGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitudeStr(String(pos.coords.latitude))
        setLongitudeStr(String(pos.coords.longitude))
        toast.success('Coordenadas GPS capturadas!')
        setCapturandoGps(false)
      },
      (err) => {
        console.error('Erro ao obter GPS:', err)
        toast.error('Não foi possível obter a localização. Verifique as permissões de GPS no seu navegador.')
        setCapturandoGps(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const fullAddress = logradouro ? `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${ufResidencia}` : ''

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-highlight uppercase tracking-wider border-b border-zinc-800 pb-1">Documentação Básica</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <Label>CPF</Label>
            {cpf.trim().length > 0 && (
              <span className={`text-[10px] font-semibold ${isCpfValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isCpfValid ? '✓ Válido' : '✕ Inválido'}
              </span>
            )}
          </div>
          <Input
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            className={`bg-[#181818] border-borderCustom text-white mt-1 ${
              cpf.trim().length > 0 && !isCpfValid ? 'border-rose-500/60 focus:border-rose-500' : ''
            }`}
          />
        </div>
        <div>
          <Label>Identidade (RG)</Label>
          <Input
            value={rg}
            onChange={(e) => setRg(e.target.value)}
            placeholder="Número do RG"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>Número do NIS (PIS/PASEP)</Label>
          <Input
            value={nis}
            onChange={(e) => setNis(e.target.value)}
            placeholder="Número do NIS"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
      </div>

      <h3 className="text-xs font-bold text-highlight uppercase tracking-wider border-b border-zinc-800 pb-1 pt-2">Endereço Residencial</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3">
          <Label>Avenida / Rua / Travessa</Label>
          <Input
            value={logradouro}
            onChange={(e) => setLogradouro(e.target.value)}
            placeholder="Ex: Av. Sete de Setembro"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>Número</Label>
          <Input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Nº"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>CEP</Label>
            {isFetchingCep && (
              <span className="text-[10px] text-sky-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
              </span>
            )}
          </div>
          <div className="relative mt-1">
            <Input
              value={cep}
              onChange={(e) => setCep(formatCEP(e.target.value))}
              placeholder="44350-000"
              className="bg-[#181818] border-borderCustom text-white pr-8"
            />
            <button
              type="button"
              onClick={() => consultarCep && consultarCep()}
              disabled={isFetchingCep}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              title="Consultar CEP nos Correios"
            >
              {isFetchingCep ? <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" /> : <Search className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Bairro / Localidade</Label>
          <Input
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            placeholder="Ex: Centro"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>Cidade</Label>
          <Input
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Ex: Sapeaçu"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>UF Residência</Label>
          <Input
            value={ufResidencia}
            onChange={(e) => setUfResidencia(e.target.value.toUpperCase())}
            placeholder="Ex: BA"
            maxLength={2}
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>Área Residencial</Label>
          <select
            value={areaResidencia}
            onChange={(e) => setAreaResidencia(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
          >
            <option value="Urbana">Urbana</option>
            <option value="Rural">Rural</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Área de Localização Diferenciada</Label>
          <select
            value={areaDiferenciada}
            onChange={(e) => setAreaDiferenciada(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
          >
            <option value="Não está em área diferenciada">Não está em área diferenciada</option>
            <option value="Comunidade remanescente de quilombos">Comunidade remanescente de quilombos (Quilombola)</option>
            <option value="Terra indígena">Terra indígena</option>
            <option value="Área de assentamento cigano">Área de assentamento cigano</option>
          </select>
        </div>
        
        {/* Endereço consolidado readonly */}
        <div>
          <Label>Endereço Completo de Login (exibe no mapa)</Label>
          <Input
            type="text"
            placeholder="Rua, número, bairro, cidade..."
            value={fullAddress}
            disabled
            className="bg-zinc-800/40 border-borderCustom text-zinc-400 mt-1 cursor-not-allowed"
          />
        </div>
      </div>

      <div className="pt-2 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-1.5">
          <h3 className="text-xs font-bold text-highlight uppercase tracking-wider">Coordenadas de GPS Residencial</h3>
          <button
            type="button"
            onClick={handleCapturarGpsAtual}
            disabled={capturandoGps}
            className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-md border border-sky-500/30 transition-colors w-fit cursor-pointer"
          >
            {capturandoGps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
            {capturandoGps ? 'Obtendo GPS...' : 'Usar Minha Localização Atual'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-zinc-300">Latitude (Ex: -12.729993)</Label>
            <Input
              type="text"
              value={latitudeStr}
              onChange={(e) => setLatitudeStr(e.target.value)}
              placeholder="-12.729993"
              className="bg-[#181818] border-borderCustom text-white mt-1 font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-300">Longitude (Ex: -39.185819)</Label>
            <Input
              type="text"
              value={longitudeStr}
              onChange={(e) => setLongitudeStr(e.target.value)}
              placeholder="-39.185819"
              className="bg-[#181818] border-borderCustom text-white mt-1 font-mono text-xs"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs text-zinc-400">Visualização no Mapa (Clique ou arraste o pino para ajustar)</Label>
          <div className="mt-1.5 h-[240px] w-full rounded-xl overflow-hidden border border-borderCustom relative z-10">
            <MiniMapa
              initialLat={latitude ?? undefined}
              initialLng={longitude ?? undefined}
              onCoordinatesChange={(lat, lng) => {
                setLatitude(lat)
                setLongitude(lng)
              }}
              address={fullAddress}
              onAddressChange={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
