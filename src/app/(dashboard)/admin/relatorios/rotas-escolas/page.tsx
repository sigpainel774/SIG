'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import {
  Route,
  ArrowLeft,
  School,
  MapPin,
  Building2,
  Sparkles,
  Loader2,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { MapaRotasEscolas } from '@/components/map/MapWrapper';
import { EscolaMapeada } from '@/components/map/MapaRotasEscolas';
import { toast } from 'sonner';

export default function RotasEscolasPage() {
  const supabase = createClient();
  const [escolas, setEscolas] = useState<EscolaMapeada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const carregarEscolas = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('escolas')
        .select('id, nome, latitude, longitude, endereco, localizacao, tipo, inep, telefone, ativo')
        .is('deleted_at', null)
        .order('nome');

      if (error) throw error;

      if (isMounted.current) {
        setEscolas(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar escolas para geolocalização:', err);
      toast.error('Não foi possível carregar as escolas municipais.');
    } finally {
      if (isMounted.current) {
        setCarregando(false);
      }
    }
  };

  useEffect(() => {
    carregarEscolas();
  }, []);

  const escolasComCoords = escolas.filter(
    (e) =>
      e.latitude !== null &&
      e.longitude !== null &&
      Number(e.latitude) !== 0 &&
      Number(e.longitude) !== 0
  );

  const escolasUrbanas = escolasComCoords.filter((e) =>
    (e.localizacao || '').toUpperCase().includes('URBANA')
  );
  const escolasRurais = escolasComCoords.filter((e) =>
    (e.localizacao || '').toUpperCase().includes('RURAL')
  );

  return (
    <div className="min-h-screen bg-[#0d0d0e] text-zinc-100 p-4 md:p-8 flex flex-col gap-6">
      {/* Topo / Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26262a] pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/relatorios"
            className="p-2.5 rounded-xl bg-[#141416] border border-[#26262a] text-zinc-400 hover:text-zinc-100 hover:bg-[#1a1a1e] transition-colors"
            title="Voltar aos Relatórios Administrativos"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
              <Link href="/admin" className="hover:text-zinc-200">Administração</Link>
              <span>/</span>
              <Link href="/admin/relatorios" className="hover:text-zinc-200">Relatórios</Link>
              <span>/</span>
              <span className="text-sky-400 font-semibold">Geolocalização e Rotas</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
              Geolocalização e Rotas de Unidades Escolares
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={carregarEscolas}
            disabled={carregando}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-300 bg-[#141416] border border-[#26262a] rounded-xl hover:bg-[#1a1a1e] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Cards de Resumo & Estatísticas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#141416] border border-[#26262a] p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-zinc-400 block mb-0.5">Escolas Cadastradas</span>
            <span className="text-lg font-bold text-zinc-100">{escolas.length}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <School className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#141416] border border-[#26262a] p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-zinc-400 block mb-0.5">Com Geolocalização</span>
            <span className="text-lg font-bold text-emerald-400">{escolasComCoords.length}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MapPin className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#141416] border border-[#26262a] p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-zinc-400 block mb-0.5">Zona Urbana</span>
            <span className="text-lg font-bold text-sky-400">{escolasUrbanas.length}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#141416] border border-[#26262a] p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-zinc-400 block mb-0.5">Zona Rural</span>
            <span className="text-lg font-bold text-amber-400">{escolasRurais.length}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Route className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Componente do Mapa e Otimizador de Rotas */}
      {carregando ? (
        <div className="w-full h-[580px] rounded-2xl bg-[#141416] border border-[#26262a] flex flex-col items-center justify-center gap-3 text-zinc-400 animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          <span className="text-sm font-semibold">Carregando mapa e unidades escolares de Sapeaçu...</span>
        </div>
      ) : (
        <MapaRotasEscolas escolas={escolas} />
      )}
    </div>
  );
}
