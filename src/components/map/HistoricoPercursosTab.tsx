'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';
import {
  Calendar,
  Clock,
  MapPin,
  Car,
  User,
  Search,
  Filter,
  RefreshCw,
  School,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  Route,
  Navigation,
  Gauge,
  MoreVertical,
  Trash2,
  Radio,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MapaReplayPercurso } from './MapWrapper';
import { VisitaHistoricoItem } from './MapaReplayPercurso';
import { SEDE_SEMED_SAPEACU } from '@/lib/routeOptimizer';
import { StandardDialog } from '@/components/ui/standard-dialog';
import { Button } from '@/components/ui/button';
import {
  removerVisitaOffline,
  obterVisitasPendentes,
  marcarVisitasComoSincronizadas,
  NavegacaoLivreRegistro,
  obterNavegacoesLivresOffline,
  obterNavegacoesPendentes,
  marcarNavegacaoComoSincronizada,
  removerNavegacaoOffline,
} from '@/lib/offlineRouteStore';
import { visitasOfflineService } from '@/lib/visitas/visitasOfflineService';
import { VisitasTrajeto, VisitasTrajetoResumo } from '@/types/visitas';

export default function HistoricoPercursosTab() {
  const supabase = createClient();

  // Tipo de visualização ativa: 'navegacoes' (Navegações Livres) ou 'visitas' (Check-ins Escolas)
  const [tipoHistorico, setTipoHistorico] = useState<'navegacoes' | 'visitas'>('navegacoes');

  // Estados de Navegações Livres
  const [navegacoes, setNavegacoes] = useState<NavegacaoLivreRegistro[]>([]);
  const [navSelecionadaId, setNavSelecionadaId] = useState<string | null>(null);
  const [navParaExcluir, setNavParaExcluir] = useState<NavegacaoLivreRegistro | null>(null);

  // Estados de Visitas/Check-ins
  const [visitas, setVisitas] = useState<VisitaHistoricoItem[]>([]);
  const [sessaoSelecionada, setSessaoSelecionada] = useState<string | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<VisitaHistoricoItem | null>(null);

  // Estados de Controle Comuns
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState<string>('todas');
  const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    carregarTudo();
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Carrega histórico completo (Navegações Livres + Check-ins)
  const carregarTudo = async () => {
    setCarregando(true);
    await Promise.all([carregarNavegacoesLivres(), carregarVisitasCheckins()]);
    if (isMounted.current) {
      setCarregando(false);
    }
  };

  // 1. Carrega Navegações Livres (Supabase + IndexedDB + Trajetos de Visitas)
  const carregarNavegacoesLivres = async () => {
    try {
      // Sincroniza pendências se online
      if (typeof window !== 'undefined' && navigator.onLine) {
        try {
          const pendentes = await obterNavegacoesPendentes();
          if (pendentes.length > 0) {
            const payload = pendentes.map((n) => ({
              id: n.id,
              funcionario_id: n.funcionario_id || null,
              veiculo_id: n.veiculo_id || null,
              titulo: n.titulo,
              data_inicio: n.data_inicio,
              data_fim: n.data_fim,
              duracao_segundos: n.duracao_segundos,
              distancia_metros: n.distancia_metros,
              velocidade_media_kmh: n.velocidade_media_kmh,
              velocidade_max_kmh: n.velocidade_max_kmh,
              pontos_gps: n.pontos_gps,
              status: n.status,
              observacoes: n.observacoes,
              sincronizado_em: new Date().toISOString(),
            }));

            const { error: syncErr } = await (supabase as any)
              .from('registros_navegacoes_livres')
              .upsert(payload, { onConflict: 'id' });

            if (!syncErr) {
              for (const p of pendentes) {
                await marcarNavegacaoComoSincronizada(p.id);
              }
            }
          }
        } catch (syncErr) {
          console.warn('Falha na auto-sincronização de navegações livres:', syncErr);
        }
      }

      // Busca do Supabase: registros_navegacoes_livres
      let listaServidor: NavegacaoLivreRegistro[] = [];
      try {
        const { data, error } = await (supabase as any)
          .from('registros_navegacoes_livres')
          .select(`
            id,
            funcionario_id,
            veiculo_id,
            titulo,
            data_inicio,
            data_fim,
            duracao_segundos,
            distancia_metros,
            velocidade_media_kmh,
            velocidade_max_kmh,
            pontos_gps,
            status,
            observacoes,
            sincronizado_em,
            created_at,
            funcionarios:funcionario_id (id, nome)
          `)
          .order('data_inicio', { ascending: false });

        if (!error && data) {
          listaServidor = data.map((row: any) => {
            let pts = row.pontos_gps;
            if (typeof pts === 'string') {
              try {
                pts = JSON.parse(pts);
              } catch {
                pts = [];
              }
            }
            const ptsArray = Array.isArray(pts) ? pts : [];
            const dataInicioTimestamp = new Date(row.data_inicio).getTime() || Date.now();

            return {
              id: row.id,
              funcionario_id: row.funcionario_id,
              funcionario_nome: row.funcionarios?.nome ?? 'Servidor / Motorista',
              veiculo_id: row.veiculo_id,
              titulo: row.titulo,
              data_inicio: row.data_inicio,
              data_fim: row.data_fim,
              duracao_segundos: row.duracao_segundos || 0,
              distancia_metros: Number(row.distancia_metros) || 0,
              velocidade_media_kmh: Number(row.velocidade_media_kmh) || 0,
              velocidade_max_kmh: Number(row.velocidade_max_kmh) || 0,
              pontos_gps: ptsArray.map((p: any) => ({
                latitude: Number(p.latitude) || 0,
                longitude: Number(p.longitude) || 0,
                timestamp: Number(p.timestamp) || dataInicioTimestamp,
                speedKmh: Number(p.speedKmh ?? (p.speed ? p.speed * 3.6 : 0)) || 0,
                heading: Number(p.heading) || 0,
                accuracy: Number(p.accuracy) || 10,
                distanceM: Number(p.distanceM) || 0,
              })),
              status: row.status ?? 'FINALIZADA',
              observacoes: row.observacoes ?? null,
              sincronizado: true,
              created_at: row.created_at,
            };
          });
        }
      } catch (err) {
        console.warn('Falha ao buscar registros_navegacoes_livres:', err);
      }

      // Busca do Supabase: visitas_trajetos (Trajetos gravados no módulo Alpha Visitas)
      let listaTrajetosVisitasServidor: NavegacaoLivreRegistro[] = [];
      try {
        const { data: dataTrajetos, error: errTrajetos } = await (supabase as any)
          .from('visitas_trajetos')
          .select('*')
          .is('deleted_at', null)
          .order('started_at', { ascending: false });

        if (!errTrajetos && dataTrajetos) {
          listaTrajetosVisitasServidor = dataTrajetos.map((row: any) => {
            let rawPontos = row.posicoes;
            if (typeof rawPontos === 'string') {
              try {
                rawPontos = JSON.parse(rawPontos);
              } catch {
                rawPontos = [];
              }
            }
            const ptsArray = Array.isArray(rawPontos) ? rawPontos : [];
            const dataInicioTimestamp = (row.started_at ? new Date(row.started_at).getTime() : Date.now()) || Date.now();

            const pontosGpsFormatados = ptsArray.map((p: any) => ({
              latitude: Number(p.latitude) || 0,
              longitude: Number(p.longitude) || 0,
              timestamp: Number(p.timestamp) || dataInicioTimestamp,
              speedKmh: Number(p.speedKmh ?? (p.speed ? p.speed * 3.6 : 0)) || 0,
              heading: Number(p.heading) || 0,
              accuracy: Number(p.accuracy) || 10,
              distanceM: Number(p.distanceM) || 0,
            }));

            const dataInicioStr = row.started_at || new Date().toISOString();
            const dataObj = new Date(dataInicioStr);
            const dataFormatada = !isNaN(dataObj.getTime()) ? dataObj.toLocaleDateString('pt-BR') : '';

            return {
              id: row.id,
              funcionario_id: row.usuario_id || null,
              funcionario_nome: 'Agente / Servidor (Visitas)',
              veiculo_id: row.veiculo_id || null,
              titulo: row.nome || `Trajeto Visitas - ${dataFormatada}`,
              data_inicio: dataInicioStr,
              data_fim: row.ended_at || null,
              duracao_segundos: (Number(row.moving_seconds) || 0) + (Number(row.visit_seconds) || 0),
              distancia_metros: Number(row.distance_meters) || 0,
              velocidade_media_kmh: 0,
              velocidade_max_kmh: 0,
              pontos_gps: pontosGpsFormatados,
              status: 'FINALIZADA' as const,
              observacoes: row.observacoes || null,
              sincronizado: true,
              created_at: row.created_at || row.started_at,
            };
          });
        }
      } catch (err) {
        console.warn('Falha ao buscar visitas_trajetos do Supabase:', err);
      }

      // Busca do IndexedDB: offlineRouteStore (navegações livres locais)
      const locaisOfflineRoute = await obterNavegacoesLivresOffline();

      // Busca do IndexedDB: visitasOfflineService (trajetos locais gravados 100% offline)
      let locaisVisitasAlpha: NavegacaoLivreRegistro[] = [];
      try {
        const trajetosAlpha = await visitasOfflineService.getTrajetos();
        const trajetosCompletosPromessas = (trajetosAlpha || []).map(async (t) => {
          const detalhe = await visitasOfflineService.obterTrajetoCompletoLocal(t.id);
          let rawPontos = detalhe?.posicoes || (t as any).posicoes || [];
          if (typeof rawPontos === 'string') {
            try {
              rawPontos = JSON.parse(rawPontos);
            } catch {
              rawPontos = [];
            }
          }
          const ptsArray = Array.isArray(rawPontos) ? rawPontos : [];
          const dataInicioTimestamp = (t.started_at ? new Date(t.started_at).getTime() : Date.now()) || Date.now();

          const pontosGpsFormatados = ptsArray.map((p: any) => ({
            latitude: Number(p.latitude) || 0,
            longitude: Number(p.longitude) || 0,
            timestamp: Number(p.timestamp) || dataInicioTimestamp,
            speedKmh: Number(p.speedKmh ?? (p.speed ? p.speed * 3.6 : 0)) || 0,
            heading: Number(p.heading) || 0,
            accuracy: Number(p.accuracy) || 10,
            distanceM: Number(p.distanceM) || 0,
          }));

          const dataInicioStr = t.started_at || new Date().toISOString();
          const dataObj = new Date(dataInicioStr);
          const dataFormatada = !isNaN(dataObj.getTime()) ? dataObj.toLocaleDateString('pt-BR') : '';

          return {
            id: t.id,
            funcionario_id: t.usuario_id || null,
            funcionario_nome: 'Agente / Servidor (Offline)',
            veiculo_id: t.veiculo_id || null,
            titulo: (t as any).nome || `Trajeto Offline - ${dataFormatada}`,
            data_inicio: dataInicioStr,
            data_fim: t.ended_at || null,
            duracao_segundos: (Number(t.moving_seconds) || 0) + (Number(t.visit_seconds) || 0),
            distancia_metros: Number(t.distance_meters) || 0,
            velocidade_media_kmh: 0,
            velocidade_max_kmh: 0,
            pontos_gps: pontosGpsFormatados,
            status: 'FINALIZADA' as const,
            observacoes: (t as any).observacoes || null,
            sincronizado: false,
            created_at: t.created_at || t.started_at,
          };
        });

        locaisVisitasAlpha = await Promise.all(trajetosCompletosPromessas);
      } catch (err) {
        console.warn('Falha ao obter trajetos offline do visitasOfflineService:', err);
      }

      // Consolidação de todas as fontes com deduplicação por ID (priorizando as versões com mais waypoints se disponíveis)
      const mapaConsolidado = new Map<string, NavegacaoLivreRegistro>();

      // 1. Injeta servidor primeiro
      for (const item of [...listaServidor, ...listaTrajetosVisitasServidor]) {
        mapaConsolidado.set(item.id, item);
      }

      // 2. Injeta/sobrescreve com locais offline caso possuam waypoints ou sejam mais recentes
      for (const item of [...locaisOfflineRoute, ...locaisVisitasAlpha]) {
        const existente = mapaConsolidado.get(item.id);
        if (!existente || (item.pontos_gps && item.pontos_gps.length >= (existente.pontos_gps?.length || 0))) {
          mapaConsolidado.set(item.id, item);
        }
      }

      const consolidadas = Array.from(mapaConsolidado.values()).sort(
        (a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime()
      );

      if (isMounted.current) {
        setNavegacoes(consolidadas);
        if (consolidadas.length > 0) {
          setNavSelecionadaId((prev) => (prev && consolidadas.some((c) => c.id === prev) ? prev : consolidadas[0].id));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar navegações livres:', err);
    }
  };

  // 2. Carrega Visitas / Check-ins de Escolas
  const carregarVisitasCheckins = async () => {
    try {
      if (typeof window !== 'undefined' && navigator.onLine) {
        try {
          const pendentes = await obterVisitasPendentes();
          if (pendentes.length > 0) {
            const payload = pendentes.map((v) => ({
              id: v.id,
              escola_id: v.escola_id,
              funcionario_id: v.funcionario_id || null,
              rota_nome: v.rota_nome || 'Roteiro de Visitas',
              data_hora_chegada: v.data_hora_chegada,
              latitude: v.latitude,
              longitude: v.longitude,
              distancia_ponto_metros: v.distancia_ponto_metros,
              odometro_km: v.odometro_km,
              observacoes: v.observacoes,
              status: v.status,
              sincronizado_em: new Date().toISOString(),
            }));

            const { error: syncErr } = await supabase
              .from('registros_visitas_rotas')
              .upsert(payload, { onConflict: 'id' });

            if (!syncErr) {
              await marcarVisitasComoSincronizadas(pendentes.map((p) => p.id));
            }
          }
        } catch (syncErr) {
          console.warn('Falha ao auto-sincronizar visitas offline:', syncErr);
        }
      }

      const { data, error } = await supabase
        .from('registros_visitas_rotas')
        .select(`
          id,
          escola_id,
          funcionario_id,
          rota_nome,
          data_hora_chegada,
          latitude,
          longitude,
          distancia_ponto_metros,
          odometro_km,
          observacoes,
          status,
          sincronizado_em,
          escolas:escola_id (
            id,
            nome,
            endereco,
            localizacao,
            latitude,
            longitude
          ),
          funcionarios:funcionario_id (
            id,
            nome
          )
        `)
        .order('data_hora_chegada', { ascending: false });

      if (error) throw error;

      const formatados: VisitaHistoricoItem[] = (data || []).map((row: any) => {
        const escolaRel = row.escolas;
        const funcRel = row.funcionarios;

        const lat =
          row.latitude !== null && row.latitude !== undefined && Number(row.latitude) !== 0
            ? Number(row.latitude)
            : escolaRel?.latitude
            ? Number(escolaRel.latitude)
            : SEDE_SEMED_SAPEACU.latitude;

        const lng =
          row.longitude !== null && row.longitude !== undefined && Number(row.longitude) !== 0
            ? Number(row.longitude)
            : escolaRel?.longitude
            ? Number(escolaRel.longitude)
            : SEDE_SEMED_SAPEACU.longitude;

        const nomeEscola =
          escolaRel?.nome ?? (row.escola_id ? 'Escola Municipal' : 'Secretaria Municipal de Educação (SEMED)');

        return {
          id: row.id,
          escola_id: row.escola_id ?? null,
          escola_nome: nomeEscola,
          data_hora_chegada: row.data_hora_chegada,
          latitude: lat,
          longitude: lng,
          distancia_ponto_metros: row.distancia_ponto_metros ? Number(row.distancia_ponto_metros) : null,
          odometro_km: row.odometro_km ? Number(row.odometro_km) : null,
          observacoes: row.observacoes ?? null,
          status: row.status ?? 'REALIZADA',
          funcionario_nome: funcRel?.nome ?? 'Servidor / Motorista',
          escola_endereco: escolaRel?.endereco ?? null,
          escola_localizacao: escolaRel?.localizacao ?? (row.escola_id ? 'URBANA' : 'SEDE'),
        };
      });

      const pendentesLocais = await obterVisitasPendentes();
      const idsServidor = new Set(formatados.map((item) => item.id));

      const formatadosPendentes: VisitaHistoricoItem[] = pendentesLocais
        .filter((p) => !idsServidor.has(p.id))
        .map((p) => ({
          id: p.id,
          escola_id: p.escola_id,
          escola_nome: p.escola_nome || 'Ponto de Parada',
          data_hora_chegada: p.data_hora_chegada,
          latitude: p.latitude ?? SEDE_SEMED_SAPEACU.latitude,
          longitude: p.longitude ?? SEDE_SEMED_SAPEACU.longitude,
          distancia_ponto_metros: p.distancia_ponto_metros,
          odometro_km: p.odometro_km,
          observacoes: p.observacoes ? `${p.observacoes} [Salvo no Aparelho]` : 'Salvo no Aparelho (Pendente de Sync)',
          status: p.status ?? 'REALIZADA',
          funcionario_nome: 'Servidor / Motorista',
          escola_endereco: null,
          escola_localizacao: 'URBANA',
        }));

      const listaCompleta = [...formatadosPendentes, ...formatados].sort(
        (a, b) => new Date(b.data_hora_chegada).getTime() - new Date(a.data_hora_chegada).getTime()
      );

      if (isMounted.current) {
        setVisitas(listaCompleta);
      }
    } catch (err: any) {
      console.error('Erro ao carregar histórico de visitas:', err);
    }
  };

  // Excluir Navegação Livre
  const handleConfirmarExclusaoNavegacao = async () => {
    if (!navParaExcluir) return;
    setExcluindo(true);
    try {
      // 1. Tenta remover do Supabase (registros_navegacoes_livres ou visitas_trajetos)
      try {
        await (supabase as any)
          .from('registros_navegacoes_livres')
          .delete()
          .eq('id', navParaExcluir.id);
      } catch {}

      try {
        await (supabase as any)
          .from('visitas_trajetos')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', navParaExcluir.id);
      } catch {}

      // 2. Remove do IndexedDB (offlineRouteStore e visitasOfflineService)
      await removerNavegacaoOffline(navParaExcluir.id);
      try {
        const trajetosAlpha = await visitasOfflineService.getTrajetos();
        const filtrados = (trajetosAlpha || []).filter((t) => t.id !== navParaExcluir.id);
        await visitasOfflineService.setTrajetos(filtrados);
      } catch {}

      // 3. Atualiza estado
      setNavegacoes((prev) => prev.filter((n) => n.id !== navParaExcluir.id));
      if (navSelecionadaId === navParaExcluir.id) {
        setNavSelecionadaId(null);
      }
      toast.success(`Navegação "${navParaExcluir.titulo}" excluída com sucesso!`);
      setNavParaExcluir(null);
    } catch (err) {
      console.error('Erro ao excluir navegação:', err);
      toast.error('Não foi possível excluir o percurso.');
    } finally {
      if (isMounted.current) setExcluindo(false);
    }
  };

  // Excluir Check-in / Visita
  const handleConfirmarExclusaoVisita = async () => {
    if (!itemParaExcluir) return;
    setExcluindo(true);
    try {
      const { error } = await supabase
        .from('registros_visitas_rotas')
        .delete()
        .eq('id', itemParaExcluir.id);

      if (error) throw error;
      await removerVisitaOffline(itemParaExcluir.id);

      setVisitas((prev) => prev.filter((v) => v.id !== itemParaExcluir.id));
      toast.success(`Parada de "${itemParaExcluir.escola_nome}" excluída com sucesso!`);
      setItemParaExcluir(null);
    } catch (err) {
      console.error('Erro ao excluir visita:', err);
      toast.error('Não foi possível excluir a parada.');
    } finally {
      if (isMounted.current) setExcluindo(false);
    }
  };

  // Agrupamento de Visitas por Data
  const sessoesPorDataVisitas = useMemo(() => {
    const grupos: Record<string, VisitaHistoricoItem[]> = {};
    visitas.forEach((v) => {
      const d = new Date(v.data_hora_chegada);
      const dataChave = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Bahia',
      });
      if (!grupos[dataChave]) grupos[dataChave] = [];
      grupos[dataChave].push(v);
    });
    return grupos;
  }, [visitas]);

  const datasVisitasDisponiveis = useMemo(() => Object.keys(sessoesPorDataVisitas), [sessoesPorDataVisitas]);

  useEffect(() => {
    if (!sessaoSelecionada && datasVisitasDisponiveis.length > 0) {
      setSessaoSelecionada(datasVisitasDisponiveis[0]);
    }
  }, [datasVisitasDisponiveis, sessaoSelecionada]);

  // Navegação Livre ativa selecionada para replay
  const navegacaoAtiva = useMemo(() => {
    if (!navSelecionadaId) return navegacoes.length > 0 ? navegacoes[0] : null;
    return navegacoes.find((n) => n.id === navSelecionadaId) || null;
  }, [navegacoes, navSelecionadaId]);

  // Visitas da sessão selecionada para replay
  const visitasSessaoAtiva = useMemo(() => {
    if (!sessaoSelecionada || !sessoesPorDataVisitas[sessaoSelecionada]) return [];
    return sessoesPorDataVisitas[sessaoSelecionada];
  }, [sessaoSelecionada, sessoesPorDataVisitas]);

  // Navegações filtradas na tabela
  const navegacoesFiltradas = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return navegacoes.filter((n) => {
      if (filtroData !== 'todas') {
        const dataN = new Date(n.data_inicio).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'America/Bahia',
        });
        if (dataN !== filtroData) return false;
      }
      if (!termo) return true;
      return (
        n.titulo.toLowerCase().includes(termo) ||
        (n.funcionario_nome || '').toLowerCase().includes(termo) ||
        (n.observacoes || '').toLowerCase().includes(termo)
      );
    });
  }, [navegacoes, busca, filtroData]);

  // Visitas filtradas na tabela
  const visitasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return visitas.filter((v) => {
      if (filtroData !== 'todas') {
        const dataV = new Date(v.data_hora_chegada).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'America/Bahia',
        });
        if (dataV !== filtroData) return false;
      }
      if (!termo) return true;
      return (
        v.escola_nome.toLowerCase().includes(termo) ||
        (v.funcionario_nome || '').toLowerCase().includes(termo) ||
        (v.observacoes || '').toLowerCase().includes(termo)
      );
    });
  }, [visitas, busca, filtroData]);

  // Estatísticas Gerais
  const stats = useMemo(() => {
    const totalNavegacoes = navegacoes.length;
    const totalKmNav = navegacoes.reduce((acc, curr) => acc + curr.distancia_metros, 0) / 1000;
    const totalPontosGps = navegacoes.reduce((acc, curr) => acc + (curr.pontos_gps?.length || 0), 0);
    const totalCheckins = visitas.length;

    return {
      totalNavegacoes,
      totalKmNav: totalKmNav.toFixed(2),
      totalPontosGps,
      totalCheckins,
    };
  }, [navegacoes, visitas]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* ── Cards de Resumo Analítico ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
              Navegações Gravadas
            </span>
            <span className="text-lg font-bold text-foreground">{stats.totalNavegacoes}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Navigation className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
              Distância Total GPS
            </span>
            <span className="text-lg font-bold text-emerald-400">
              {stats.totalKmNav} km
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Route className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
              Waypoints Registrados
            </span>
            <span className="text-lg font-bold text-indigo-400">
              {stats.totalPontosGps}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Radio className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
              Check-ins em Escolas
            </span>
            <span className="text-lg font-bold text-amber-400">
              {stats.totalCheckins}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <School className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ── Seção 1: Simulador de Replay no Mapa com Carrinho e Telemetria ── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-sky-400 font-bold uppercase tracking-wider mb-0.5">
              <Car className="w-4 h-4" />
              Simulador de Percurso &amp; Telemetria
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Replay da Rota com Carrinho Animado, Velocímetro e Relógio
            </h2>
            <p className="text-xs text-muted-foreground">
              {tipoHistorico === 'navegacoes'
                ? 'Reproduz a trilha densa gravada pelo GPS metro a metro com velocidade real de cada momento.'
                : 'Reproduz as paradas das escolas cadastradas com estimativa de traçado viário.'}
            </p>
          </div>

          {/* Seletor do Tipo e do Item para Simular */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Seletor de Categoria */}
            <div className="flex items-center bg-muted/60 border border-border p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTipoHistorico('navegacoes')}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  tipoHistorico === 'navegacoes'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Navigation className="w-3.5 h-3.5" />
                Navegações Livres
              </button>
              <button
                type="button"
                onClick={() => setTipoHistorico('visitas')}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  tipoHistorico === 'visitas'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <School className="w-3.5 h-3.5" />
                Visitas Escolas
              </button>
            </div>

            {/* Dropdown de Seleção de Item */}
            {tipoHistorico === 'navegacoes' ? (
              <select
                value={navSelecionadaId || ''}
                onChange={(e) => setNavSelecionadaId(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer max-w-[240px]"
              >
                {navegacoes.map((n) => (
                  <option key={n.id} value={n.id}>
                    📍 {n.titulo} ({(n.distancia_metros / 1000).toFixed(2)} km)
                  </option>
                ))}
                {navegacoes.length === 0 && <option value="">Nenhuma navegação gravada</option>}
              </select>
            ) : (
              <select
                value={sessaoSelecionada || ''}
                onChange={(e) => setSessaoSelecionada(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer max-w-[240px]"
              >
                {datasVisitasDisponiveis.map((d) => (
                  <option key={d} value={d}>
                    📅 {d} ({sessoesPorDataVisitas[d].length} paradas)
                  </option>
                ))}
                {datasVisitasDisponiveis.length === 0 && <option value="">Nenhuma viagem gravada</option>}
              </select>
            )}
          </div>
        </div>

        {/* Mapa com Replay */}
        {carregando ? (
          <div className="w-full h-[520px] rounded-2xl bg-muted/40 flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
            <span className="text-xs font-semibold">Carregando dados do percurso...</span>
          </div>
        ) : tipoHistorico === 'navegacoes' ? (
          <MapaReplayPercurso
            navegacaoLivre={navegacaoAtiva}
            tituloPercurso={navegacaoAtiva?.titulo}
          />
        ) : (
          <MapaReplayPercurso
            visitas={visitasSessaoAtiva}
            tituloPercurso={sessaoSelecionada ? `Viagem de ${sessaoSelecionada}` : undefined}
          />
        )}
      </div>

      {/* ── Seção 2: Tabela de Histórico Detalhado ── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              {tipoHistorico === 'navegacoes'
                ? 'Histórico de Navegações Livres Gravadas'
                : 'Histórico Completo de Paradas Registradas'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {tipoHistorico === 'navegacoes'
                ? 'Lista detalhada de percursos gravados por GPS com métricas de distância, duração e velocidades.'
                : 'Auditoria de horários exatos de chegada em escolas, motorista responsável e distância GPS.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Campo de Busca */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por título, responsável..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              type="button"
              onClick={carregarTudo}
              disabled={carregando}
              className="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-hoverCustom transition-colors cursor-pointer disabled:opacity-50"
              title="Recarregar histórico"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', carregando && 'animate-spin text-sky-500')} />
            </button>
          </div>
        </div>

        {/* Tabela Condicional */}
        {tipoHistorico === 'navegacoes' ? (
          /* Tabela de Navegações Livres */
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Data / Início</th>
                  <th className="py-2.5 px-3">Título do Percurso</th>
                  <th className="py-2.5 px-3">Distância</th>
                  <th className="py-2.5 px-3">Duração</th>
                  <th className="py-2.5 px-3">Velocidade Média / Máx</th>
                  <th className="py-2.5 px-3">Pontos GPS</th>
                  <th className="py-2.5 px-3">Responsável</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {navegacoesFiltradas.map((nav) => {
                  const dataObj = new Date(nav.data_inicio);
                  const dataStr = dataObj.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    timeZone: 'America/Bahia',
                  });
                  const horaStr = dataObj.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Bahia',
                  });

                  const isSelecionada = navSelecionadaId === nav.id;
                  const durMinutos = Math.round(nav.duracao_segundos / 60);

                  return (
                    <tr
                      key={nav.id}
                      className={cn(
                        'hover:bg-muted/30 transition-colors cursor-pointer',
                        isSelecionada && 'bg-sky-500/10'
                      )}
                      onClick={() => setNavSelecionadaId(nav.id)}
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-foreground">{horaStr}</div>
                        <div className="text-[10px] text-muted-foreground">{dataStr}</div>
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate max-w-[220px]">{nav.titulo}</span>
                        </div>
                        {nav.observacoes && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                            {nav.observacoes}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-emerald-400">
                          {(nav.distancia_metros / 1000).toFixed(2)} km
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                        {durMinutos >= 60
                          ? `${Math.floor(durMinutos / 60)}h ${durMinutos % 60}m`
                          : `${durMinutos} min`}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-medium text-foreground">
                          {nav.velocidade_media_kmh} km/h
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Máx: {nav.velocidade_max_kmh} km/h
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-foreground">
                          {(nav.pontos_gps || []).length} pts
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{nav.funcionario_nome}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNavParaExcluir(nav);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Excluir Percurso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {navegacoesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      <p className="text-xs font-semibold">
                        Nenhuma navegação livre encontrada. Inicie uma gravação na aba "Navegação Livre"!
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tabela de Visitas a Escolas */
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Unidade / Local</th>
                  <th className="py-2.5 px-3">Localização</th>
                  <th className="py-2.5 px-3">Distância GPS</th>
                  <th className="py-2.5 px-3">Responsável</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Observações</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visitasFiltradas.map((item) => {
                  const dataObj = new Date(item.data_hora_chegada);
                  const dataStr = dataObj.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    timeZone: 'America/Bahia',
                  });
                  const horaStr = dataObj.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'America/Bahia',
                  });

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-foreground">{horaStr}</div>
                        <div className="text-[10px] text-muted-foreground">{dataStr}</div>
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate max-w-[220px]">{item.escola_nome}</span>
                        </div>
                        {item.escola_endereco && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                            {item.escola_endereco}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md text-[10px] font-bold',
                            item.escola_localizacao === 'RURAL'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          )}
                        >
                          {item.escola_localizacao || 'URBANA'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.distancia_ponto_metros !== null ? (
                          <span className="font-mono text-muted-foreground">
                            {item.distancia_ponto_metros}m
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{item.funcionario_nome}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                            item.status === 'REALIZADA'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          )}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {item.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                        {item.observacoes || (
                          <span className="text-[10px] italic text-muted-foreground/60">
                            Sem observações
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setItemParaExcluir(item)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Excluir Parada"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {visitasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      <p className="text-xs font-semibold">Nenhuma parada encontrada com os filtros selecionados.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de Exclusão de Navegação Livre ── */}
      {navParaExcluir && (
        <StandardDialog
          open={Boolean(navParaExcluir)}
          onOpenChange={(open) => {
            if (!open && !excluindo) setNavParaExcluir(null);
          }}
          title="Excluir Percurso de Navegação"
          description="Tem certeza que deseja excluir este percurso do histórico e do simulador de replay?"
          maxWidth="sm:max-w-[440px]"
          footer={
            <div className="flex items-center justify-end gap-2 w-full pt-2">
              <Button
                type="button"
                variant="ghost"
                disabled={excluindo}
                onClick={() => setNavParaExcluir(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={excluindo}
                onClick={handleConfirmarExclusaoNavegacao}
                className="gap-1.5 font-bold"
              >
                {excluindo ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirmar Exclusão
                  </>
                )}
              </Button>
            </div>
          }
        >
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-foreground">
                Percurso: <span className="text-destructive font-bold">{navParaExcluir.titulo}</span>
              </p>
              <p className="text-muted-foreground">
                Distância: {(navParaExcluir.distancia_metros / 1000).toFixed(2)} km (
                {(navParaExcluir.pontos_gps || []).length} waypoints)
              </p>
              <p className="text-[11px] text-muted-foreground">
                Esta ação removerá permanentemente este traçado do banco de dados e do dispositivo.
              </p>
            </div>
          </div>
        </StandardDialog>
      )}

      {/* ── Modal de Exclusão de Visita ── */}
      {itemParaExcluir && (
        <StandardDialog
          open={Boolean(itemParaExcluir)}
          onOpenChange={(open) => {
            if (!open && !excluindo) setItemParaExcluir(null);
          }}
          title="Excluir Registro de Parada"
          description="Tem certeza que deseja excluir esta parada registrada no histórico?"
          maxWidth="sm:max-w-[440px]"
          footer={
            <div className="flex items-center justify-end gap-2 w-full pt-2">
              <Button
                type="button"
                variant="ghost"
                disabled={excluindo}
                onClick={() => setItemParaExcluir(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={excluindo}
                onClick={handleConfirmarExclusaoVisita}
                className="gap-1.5 font-bold"
              >
                {excluindo ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirmar Exclusão
                  </>
                )}
              </Button>
            </div>
          }
        >
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-foreground">
                Local: <span className="text-destructive font-bold">{itemParaExcluir.escola_nome}</span>
              </p>
              <p className="text-muted-foreground">
                Horário:{' '}
                {new Date(itemParaExcluir.data_hora_chegada).toLocaleString('pt-BR', {
                  timeZone: 'America/Bahia',
                })}
              </p>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
