'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/useAuthStore';
import {
  CoordinateTuple,
  VisitasArea,
  VisitasPonto,
  VisitasRoteiro,
  VisitasVeiculo,
  VisitasTrajeto,
  VisitasTrajetoResumo,
  VisitasGeoPdfMap,
  ActiveVisitasTab,
  AreaStatus,
} from '@/types/visitas';
import {
  calcularAreaPoligonoMetrosQuadrados,
  metrosQuadradosParaHectares,
  pontoDentroDoPoligono,
} from '@/lib/visitas/areaCalculator';
import { visitasOfflineService } from '@/lib/visitas/visitasOfflineService';
import { salvarNavegacaoLivreOffline } from '@/lib/offlineRouteStore';
import { limparPayloadParaTabela } from '@/lib/alphaOfflineManager';

// Componentes
import { VisitasOfflineSyncBanner } from '@/components/alpha/visitas/VisitasOfflineSyncBanner';
import {
  VisitasDrawingToolbar,
  MapInteractionMode,
} from '@/components/alpha/visitas/VisitasDrawingToolbar';
import { VisitasMapCore } from '@/components/map/MapWrapper';
import { VisitasAreasTab } from '@/components/alpha/visitas/VisitasAreasTab';
import { VisitasAreaEditorModal } from '@/components/alpha/visitas/VisitasAreaEditorModal';
import { VisitasPontosTab } from '@/components/alpha/visitas/VisitasPontosTab';
import { VisitasPontoModal } from '@/components/alpha/visitas/VisitasPontoModal';
import { VisitasRoteirosTab } from '@/components/alpha/visitas/VisitasRoteirosTab';
import VisitasNavegacaoLiveTab from '@/components/alpha/visitas/VisitasNavegacaoLiveTab';
import { VisitasHistoricoTrajetosTab } from '@/components/alpha/visitas/VisitasHistoricoTrajetosTab';
import { VisitasVeiculosTab } from '@/components/alpha/visitas/VisitasVeiculosTab';
import { VisitasGeoPdfTab } from '@/components/alpha/visitas/VisitasGeoPdfTab';
import { VisitasExportPanel } from '@/components/alpha/visitas/VisitasExportPanel';

// Ícones e UI
import {
  Map as MapIcon,
  Pentagon,
  MapPin,
  Calendar,
  Navigation,
  Clock,
  Car,
  FileText,
  Download,
  Sparkles,
  Loader2,
  Sliders,
  HardDrive,
} from 'lucide-react';
import { VisitasConfigModal } from '@/components/alpha/visitas/VisitasConfigModal';
import { VisitasDownloadMapaModal } from '@/components/alpha/visitas/VisitasDownloadMapaModal';
import { toast } from 'sonner';

export default function VisitasPage() {
  const supabase = createClient();
  const { funcionario } = useAuthStore();

  // Aba ativa
  const [activeTab, setActiveTab] = useState<ActiveVisitasTab>('mapa');
  const [loading, setLoading] = useState(true);

  // Estados dos Dados
  const [areas, setAreas] = useState<VisitasArea[]>([]);
  const [pontos, setPontos] = useState<VisitasPonto[]>([]);
  const [roteiros, setRoteiros] = useState<VisitasRoteiro[]>([]);
  const [veiculos, setVeiculos] = useState<VisitasVeiculo[]>([]);
  const [trajetos, setTrajetos] = useState<VisitasTrajetoResumo[]>([]);
  const [mapasGeoPdf, setMapasGeoPdf] = useState<VisitasGeoPdfMap[]>([]);

  // Estados do Mapa e Desenho
  const [mapCenter, setMapCenter] = useState<CoordinateTuple>([-12.7214, -39.1989]); // Sapeaçu-BA
  const [mapZoom, setMapZoom] = useState(14);
  const [drawMode, setDrawMode] = useState<MapInteractionMode>('select');
  const [draftVertices, setDraftVertices] = useState<CoordinateTuple[]>([]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    heading?: number;
  } | null>(null);
  const [selectedAreaOnToolbar, setSelectedAreaOnToolbar] = useState<VisitasArea | null>(null);

  // Modais
  const [modalAreaAberto, setModalAreaAberto] = useState(false);
  const [areaEmEdicao, setAreaEmEdicao] = useState<Partial<VisitasArea> | null>(null);

  const [modalPontoAberto, setModalPontoAberto] = useState(false);
  const [pontoEmEdicao, setPontoEmEdicao] = useState<Partial<VisitasPonto> | null>(null);

  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const [modalDownloadMapaAberto, setModalDownloadMapaAberto] = useState(false);

  const [roteiroParaRastrear, setRoteiroParaRastrear] = useState<VisitasRoteiro | null>(null);

  // 1. Carga inicial de dados (Offline-first com fallback para Supabase)
  const carregarDados = useCallback(async () => {
    try {
      // Tenta ler do cache local primeiro
      const [cachedAreas, cachedPontos, cachedRoteiros, cachedVeiculos, cachedTrajetos, cachedGeoPdf] =
        await Promise.all([
          visitasOfflineService.getAreas(),
          visitasOfflineService.getPontos(),
          visitasOfflineService.getRoteiros(),
          visitasOfflineService.getVeiculos(),
          visitasOfflineService.getTrajetos(),
          visitasOfflineService.getGeoPdfs(),
        ]);

      if (cachedAreas.length > 0) setAreas(cachedAreas);
      if (cachedPontos.length > 0) setPontos(cachedPontos);
      if (cachedRoteiros.length > 0) setRoteiros(cachedRoteiros);
      if (cachedVeiculos.length > 0) setVeiculos(cachedVeiculos);
      if (cachedTrajetos.length > 0) setTrajetos(cachedTrajetos);
      if (cachedGeoPdf.length > 0) setMapasGeoPdf(cachedGeoPdf);

      // Se temos cache ou estamos offline, desativa o loading inicial de imediato
      if (
        cachedAreas.length > 0 ||
        cachedPontos.length > 0 ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      ) {
        setLoading(false);
      }

      // Se online, sincroniza do Supabase
      if (navigator.onLine) {
        const [resAreas, resPontos, resRoteiros, resVeiculos, resTrajetos, resGeoPdf] =
          await Promise.all([
            (supabase as any).from('visitas_areas').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
            (supabase as any).from('visitas_pontos').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
            (supabase as any).from('visitas_roteiros').select('*').is('deleted_at', null).order('data_planejada', { ascending: false }),
            (supabase as any).from('visitas_veiculos').select('*').is('deleted_at', null).order('nome', { ascending: true }),
            (supabase as any).from('visitas_trajetos').select('id, area_id, roteiro_id, veiculo_id, modo, nome, observacoes, started_at, ended_at, distance_meters, moving_seconds, visit_seconds, estimated_liters, estimated_cost, usuario_id, created_at, deleted_at').is('deleted_at', null).order('started_at', { ascending: false }),
            (supabase as any).from('visitas_mapas_geopdf').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
          ]);

        if (resAreas.data) {
          setAreas(resAreas.data);
          await visitasOfflineService.setAreas(resAreas.data);
        }
        if (resPontos.data) {
          setPontos(resPontos.data);
          await visitasOfflineService.setPontos(resPontos.data);
        }
        if (resRoteiros.data) {
          setRoteiros(resRoteiros.data);
          await visitasOfflineService.setRoteiros(resRoteiros.data);
        }
        if (resVeiculos.data) {
          setVeiculos(resVeiculos.data);
          await visitasOfflineService.setVeiculos(resVeiculos.data);
        }
        if (resTrajetos.data) {
          // Fusão inteligente: mantém rotas locais pendentes e mescla com as do servidor
          const locaisTrajetos = await visitasOfflineService.getTrajetos();
          const mapaMerged = new Map<string, VisitasTrajetoResumo>();

          // 1. Insere registros do servidor
          for (const s of resTrajetos.data) {
            if (s && s.id) mapaMerged.set(s.id, s);
          }

          // 2. Preserva registros locais (especialmente pendentes de sincronização)
          for (const l of locaisTrajetos) {
            if (l && l.id && !mapaMerged.has(l.id)) {
              mapaMerged.set(l.id, l);
            }
          }

          const listaFinal = Array.from(mapaMerged.values()).sort((a, b) => 
            new Date(b.started_at || b.created_at || 0).getTime() - new Date(a.started_at || a.created_at || 0).getTime()
          );

          setTrajetos(listaFinal);
          await visitasOfflineService.setTrajetos(listaFinal);
        }
        if (resGeoPdf.data) {
          setMapasGeoPdf(resGeoPdf.data);
          await visitasOfflineService.setGeoPdfs(resGeoPdf.data);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar dados de Visitas:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    carregarDados();

    const handleAtualizar = () => {
      carregarDados();
    };

    window.addEventListener('sig_visitas_dados_atualizados', handleAtualizar);
    return () => {
      window.removeEventListener('sig_visitas_dados_atualizados', handleAtualizar);
    };
  }, [carregarDados]);

  // Geolocalização inicial do usuário
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({
            lat,
            lng,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading ?? 0,
          });
          setMapCenter([lat, lng]);
          setMapZoom(15);
        },
        () => {},
        { timeout: 8000, enableHighAccuracy: true }
      );
    }
  }, []);

  // --- Handlers de Desenho no Mapa ---
  const handleAddDraftVertex = (vertex: CoordinateTuple) => {
    setDraftVertices((prev) => [...prev, vertex]);
  };

  const handleUndoVertex = () => {
    setDraftVertices((prev) => prev.slice(0, -1));
  };

  const handleClearDraft = () => {
    setDraftVertices([]);
  };

  const handleFinishDraftPolygon = () => {
    if (draftVertices.length < 3) {
      toast.warning('Um polígono precisa de no mínimo 3 vértices.');
      return;
    }

    const m2 = calcularAreaPoligonoMetrosQuadrados(draftVertices);
    const ha = metrosQuadradosParaHectares(m2);

    setAreaEmEdicao({
      nome: `Área Delimitada ${areas.length + 1}`,
      vertices: draftVertices,
      square_meters: m2,
      hectares: ha,
      status: 'pendente',
      cor: '#3b82f6',
    });
    setModalAreaAberto(true);
  };

  const handlePointMapClick = (lat: number, lng: number) => {
    setPontoEmEdicao({
      nome: `Ponto ${pontos.length + 1}`,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      categoria: 'Geral',
      status: 'pendente',
    });
    setModalPontoAberto(true);
    setDrawMode('select');
  };

  const handleLocateMe = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('GPS indisponível no dispositivo.');
      return;
    }
    toast.info('Buscando localização GPS...', { icon: '🛰️' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const heading = pos.coords.heading ?? 0;
        setUserLocation({ lat, lng, accuracy, heading });
        setMapCenter([lat, lng]);
        setMapZoom(17);
        toast.success(`Localização atual localizada! (~${Math.round(accuracy)}m)`, { icon: '📍' });
      },
      () => toast.error('Não foi possível obter a posição GPS. Verifique a permissão no navegador.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // --- Salvar Área ---
  const handleSaveArea = async (areaData: Partial<VisitasArea>) => {
    const isNovo = !areaData.id;
    const novoId = areaData.id ?? crypto.randomUUID();

    const m2 = areaData.vertices
      ? calcularAreaPoligonoMetrosQuadrados(areaData.vertices)
      : areaData.square_meters ?? 0;
    const ha = metrosQuadradosParaHectares(m2);

    const payload: VisitasArea = {
      id: novoId,
      nome: areaData.nome ?? 'Área Sem Nome',
      descricao: areaData.descricao ?? null,
      status: areaData.status ?? 'pendente',
      vertices: areaData.vertices ?? [],
      square_meters: m2,
      hectares: ha,
      cor: areaData.cor ?? '#3b82f6',
      usuario_id: funcionario?.id ?? null,
      created_at: areaData.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    // Atualiza estado local imediatamente (Optimistic UI)
    const novasAreas = isNovo
      ? [payload, ...areas]
      : areas.map((a) => (a.id === novoId ? payload : a));

    setAreas(novasAreas);
    await visitasOfflineService.setAreas(novasAreas);
    setDraftVertices([]);
    setDrawMode('select');

    // Persiste no Supabase ou enfileira offline
    if (navigator.onLine) {
      try {
        const payloadLimpo = limparPayloadParaTabela('visitas_areas', payload);
        const { error } = await (supabase as any)
          .from('visitas_areas')
          .upsert(payloadLimpo, { onConflict: 'id' });
        if (error) throw error;
        toast.success('Área salva no servidor com sucesso!');
      } catch (err) {
        await visitasOfflineService.enfileirarOperacao(
          'visitas_areas',
          isNovo ? 'INSERT' : 'UPDATE',
          payload,
          novoId
        );
        toast.info('Área salva localmente (enfileirada para sincronização).');
      }
    } else {
      await visitasOfflineService.enfileirarOperacao(
        'visitas_areas',
        isNovo ? 'INSERT' : 'UPDATE',
        payload,
        novoId
      );
      toast.info('Área gravada offline com sucesso!');
    }
  };

  const handleUpdateAreaStatus = async (areaId: string, newStatus: AreaStatus) => {
    const areaAlvo = areas.find((a) => a.id === areaId);
    if (!areaAlvo) return;

    const areaAtualizada: VisitasArea = {
      ...areaAlvo,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    const novasAreas = areas.map((a) => (a.id === areaId ? areaAtualizada : a));
    setAreas(novasAreas);
    await visitasOfflineService.setAreas(novasAreas);

    if (selectedAreaOnToolbar?.id === areaId) {
      setSelectedAreaOnToolbar(areaAtualizada);
    }

    const labelStatus =
      newStatus === 'concluido'
        ? 'Concluído'
        : newStatus === 'em_andamento'
        ? 'Em Curso'
        : 'Não Iniciado';

    // Persiste no Supabase ou enfileira offline
    if (navigator.onLine) {
      try {
        const payloadLimpo = limparPayloadParaTabela('visitas_areas', areaAtualizada);
        const { error } = await (supabase as any)
          .from('visitas_areas')
          .update(payloadLimpo)
          .eq('id', areaId);
        if (error) throw error;
        toast.success(`Status da área "${areaAtualizada.nome}" alterado para ${labelStatus}!`);
      } catch (err) {
        await visitasOfflineService.enfileirarOperacao(
          'visitas_areas',
          'UPDATE',
          areaAtualizada,
          areaId
        );
        toast.info(`Status alterado para ${labelStatus} (salvo offline).`);
      }
    } else {
      await visitasOfflineService.enfileirarOperacao(
        'visitas_areas',
        'UPDATE',
        areaAtualizada,
        areaId
      );
      toast.info(`Status alterado para ${labelStatus} (modo offline).`);
    }
  };

  const handleMarcarVisitaImediataNoGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo seu navegador.');
      return;
    }

    const salvarPontoNaPosicao = (lat: number, lng: number) => {
      // Verifica se a coordenada está dentro de alguma área delimitada cadastrada
      const matchedArea = areas.find(
        (area) =>
          area.vertices &&
          area.vertices.length >= 3 &&
          pontoDentroDoPoligono([lat, lng], area.vertices)
      );

      const horaAtual = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const novoPonto: VisitasPonto = {
        id: crypto.randomUUID(),
        nome: `Visita Imediata (${horaAtual})`,
        categoria: 'Visita',
        status: 'visitado',
        latitude: lat,
        longitude: lng,
        area_id: matchedArea?.id ?? null,
        descricao: matchedArea
          ? `Visita manual registrada na área "${matchedArea.nome}".`
          : 'Visita manual registrada na posição GPS atual.',
        usuario_id: funcionario?.id ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      handleSavePonto(novoPonto);
      setMapCenter([lat, lng]);
      setMapZoom(16);
      toast.success(
        `Visita imediata registrada com sucesso ${
          matchedArea ? `na área "${matchedArea.nome}"` : 'nas suas coordenadas'
        }!`
      );
    };

    if (userLocation) {
      salvarPontoNaPosicao(userLocation.lat, userLocation.lng);
    } else {
      toast.loading('Obtendo sinal GPS para marcar visita...', { id: 'gps-visita' });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          toast.dismiss('gps-visita');
          const { latitude, longitude, accuracy } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude, accuracy });
          salvarPontoNaPosicao(latitude, longitude);
        },
        (err) => {
          toast.dismiss('gps-visita');
          toast.error('Não foi possível obter sua localização GPS. Ative a permissão de localização.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    const confirmou = window.confirm('Deseja realmente excluir esta área delimitada?');
    if (!confirmou) return;

    const novasAreas = areas.filter((a) => a.id !== areaId);
    setAreas(novasAreas);
    await visitasOfflineService.setAreas(novasAreas);

    if (navigator.onLine) {
      try {
        await (supabase as any)
          .from('visitas_areas')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', areaId);
        toast.success('Área excluída com sucesso!');
      } catch (err) {
        await visitasOfflineService.enfileirarOperacao('visitas_areas', 'DELETE', {}, areaId);
      }
    } else {
      await visitasOfflineService.enfileirarOperacao('visitas_areas', 'DELETE', {}, areaId);
    }
  };

  // --- Salvar Ponto ---
  const handleSavePonto = async (pontoData: Partial<VisitasPonto>) => {
    const isNovo = !pontoData.id;
    const novoId = pontoData.id ?? crypto.randomUUID();

    const payload: VisitasPonto = {
      id: novoId,
      area_id: pontoData.area_id ?? null,
      nome: pontoData.nome ?? 'Ponto Sem Nome',
      categoria: pontoData.categoria ?? 'Geral',
      descricao: pontoData.descricao ?? null,
      latitude: Number(pontoData.latitude),
      longitude: Number(pontoData.longitude),
      status: pontoData.status ?? 'pendente',
      usuario_id: funcionario?.id ?? null,
      created_at: pontoData.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    const novosPontos = isNovo
      ? [payload, ...pontos]
      : pontos.map((p) => (p.id === novoId ? payload : p));

    setPontos(novosPontos);
    await visitasOfflineService.setPontos(novosPontos);

    if (navigator.onLine) {
      try {
        const payloadLimpo = limparPayloadParaTabela('visitas_pontos', payload);
        const { error } = await (supabase as any)
          .from('visitas_pontos')
          .upsert(payloadLimpo, { onConflict: 'id' });
        if (error) throw error;
        toast.success('Ponto salvo no servidor!');
      } catch (err) {
        await visitasOfflineService.enfileirarOperacao(
          'visitas_pontos',
          isNovo ? 'INSERT' : 'UPDATE',
          payload,
          novoId
        );
      }
    } else {
      await visitasOfflineService.enfileirarOperacao(
        'visitas_pontos',
        isNovo ? 'INSERT' : 'UPDATE',
        payload,
        novoId
      );
    }
  };

  const handleDeletePonto = async (pontoId: string) => {
    const confirmou = window.confirm('Deseja realmente remover este ponto?');
    if (!confirmou) return;

    const novosPontos = pontos.filter((p) => p.id !== pontoId);
    setPontos(novosPontos);
    await visitasOfflineService.setPontos(novosPontos);

    if (navigator.onLine) {
      try {
        await (supabase as any)
          .from('visitas_pontos')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', pontoId);
        toast.success('Ponto removido com sucesso!');
      } catch (err) {
        await visitasOfflineService.enfileirarOperacao('visitas_pontos', 'DELETE', {}, pontoId);
      }
    } else {
      await visitasOfflineService.enfileirarOperacao('visitas_pontos', 'DELETE', {}, pontoId);
    }
  };

  // --- Salvar Roteiro ---
  const handleSaveRoteiro = async (roteiroData: Partial<VisitasRoteiro>) => {
    const isNovo = !roteiroData.id;
    const novoId = roteiroData.id ?? crypto.randomUUID();

    const payload: VisitasRoteiro = {
      id: novoId,
      nome: roteiroData.nome ?? 'Roteiro Sem Nome',
      area_ids: roteiroData.area_ids ?? [],
      veiculo_id: roteiroData.veiculo_id ?? null,
      data_planejada: roteiroData.data_planejada ?? new Date().toISOString().split('T')[0],
      status: roteiroData.status ?? 'planejado',
      observacoes: roteiroData.observacoes ?? null,
      usuario_id: funcionario?.id ?? null,
      created_at: roteiroData.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    const novosRoteiros = isNovo
      ? [payload, ...roteiros]
      : roteiros.map((r) => (r.id === novoId ? payload : r));

    setRoteiros(novosRoteiros);
    await visitasOfflineService.setRoteiros(novosRoteiros);

    if (navigator.onLine) {
      try {
        const payloadLimpo = limparPayloadParaTabela('visitas_roteiros', payload);
        await (supabase as any)
          .from('visitas_roteiros')
          .upsert(payloadLimpo, { onConflict: 'id' });
      } catch (err) {
        await visitasOfflineService.enfileirarOperacao(
          'visitas_roteiros',
          isNovo ? 'INSERT' : 'UPDATE',
          payload,
          novoId
        );
      }
    } else {
      await visitasOfflineService.enfileirarOperacao(
        'visitas_roteiros',
        isNovo ? 'INSERT' : 'UPDATE',
        payload,
        novoId
      );
    }
  };

  const handleDeleteRoteiro = async (roteiroId: string) => {
    const confirmou = window.confirm('Deseja excluir este planejamento de roteiro?');
    if (!confirmou) return;

    const novos = roteiros.filter((r) => r.id !== roteiroId);
    setRoteiros(novos);
    await visitasOfflineService.setRoteiros(novos);

    if (navigator.onLine) {
      await (supabase as any)
        .from('visitas_roteiros')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', roteiroId);
    } else {
      await visitasOfflineService.enfileirarOperacao('visitas_roteiros', 'DELETE', {}, roteiroId);
    }
  };

  // --- Salvar Veículo ---
  const handleSaveVeiculo = async (veiculoData: Partial<VisitasVeiculo>) => {
    const isNovo = !veiculoData.id;
    const novoId = veiculoData.id ?? crypto.randomUUID();

    const payload: VisitasVeiculo = {
      id: novoId,
      nome: veiculoData.nome ?? 'Veículo Sem Nome',
      placa: veiculoData.placa ?? null,
      motor: veiculoData.motor ?? null,
      tipo_combustivel: veiculoData.tipo_combustivel ?? 'gasolina',
      consumo_km_l: veiculoData.consumo_km_l ?? 10,
      preco_litro: veiculoData.preco_litro ?? 6,
      ativo: veiculoData.ativo ?? true,
      usuario_id: funcionario?.id ?? null,
      created_at: veiculoData.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    const novos = isNovo
      ? [payload, ...veiculos]
      : veiculos.map((v) => (v.id === novoId ? payload : v));

    setVeiculos(novos);
    await visitasOfflineService.setVeiculos(novos);

    if (navigator.onLine) {
      try {
        const payloadLimpo = limparPayloadParaTabela('visitas_veiculos', payload);
        await (supabase as any)
          .from('visitas_veiculos')
          .upsert(payloadLimpo, { onConflict: 'id' });
      } catch (err) {
        await visitasOfflineService.enfileirarOperacao(
          'visitas_veiculos',
          isNovo ? 'INSERT' : 'UPDATE',
          payload,
          novoId
        );
      }
    } else {
      await visitasOfflineService.enfileirarOperacao(
        'visitas_veiculos',
        isNovo ? 'INSERT' : 'UPDATE',
        payload,
        novoId
      );
    }
  };

  const handleDeleteVeiculo = async (veiculoId: string) => {
    const confirmou = window.confirm('Deseja excluir este veículo da frota?');
    if (!confirmou) return;

    const novos = veiculos.filter((v) => v.id !== veiculoId);
    setVeiculos(novos);
    await visitasOfflineService.setVeiculos(novos);

    if (navigator.onLine) {
      await (supabase as any)
        .from('visitas_veiculos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', veiculoId);
    } else {
      await visitasOfflineService.enfileirarOperacao('visitas_veiculos', 'DELETE', {}, veiculoId);
    }
  };

  // --- Salvar Trajeto GPS Gravado (100% Offline-First) ---
  const handleSaveTrajeto = async (trajetoPayload: any) => {
    const novoId = trajetoPayload.id ?? crypto.randomUUID();
    const payloadCompleto: VisitasTrajeto = {
      ...trajetoPayload,
      id: novoId,
      usuario_id: funcionario?.id ?? null,
      created_at: new Date().toISOString(),
      deleted_at: null,
    };

    // 1. Grava o trajeto detalhado completo (com todos os waypoints e paradas) no IndexedDB local
    await visitasOfflineService.salvarTrajetoCompletoLocal(payloadCompleto);

    // 1.1 Salva também no store de navegações livres para disponibilidade instantânea no Replay com Carrinho
    try {
      await salvarNavegacaoLivreOffline({
        id: novoId,
        funcionario_id: funcionario?.id ?? null,
        funcionario_nome: funcionario?.nome ?? 'Agente / Servidor (Visitas)',
        veiculo_id: payloadCompleto.veiculo_id ?? null,
        titulo: (payloadCompleto as any).nome || `Trajeto Visitas - ${new Date(payloadCompleto.started_at).toLocaleDateString('pt-BR')}`,
        data_inicio: payloadCompleto.started_at,
        data_fim: payloadCompleto.ended_at ?? null,
        duracao_segundos: (payloadCompleto.moving_seconds || 0) + (payloadCompleto.visit_seconds || 0),
        distancia_metros: Number(payloadCompleto.distance_meters) || 0,
        velocidade_media_kmh: 0,
        velocidade_max_kmh: 0,
        pontos_gps: (payloadCompleto.posicoes || []).map((p: any) => ({
          latitude: Number(p.latitude) || 0,
          longitude: Number(p.longitude) || 0,
          timestamp: p.timestamp || (payloadCompleto.started_at ? new Date(payloadCompleto.started_at).getTime() : Date.now()),
          speedKmh: Number(p.speedKmh ?? (p.speed ? p.speed * 3.6 : 0)) || 0,
          heading: Number(p.heading) || 0,
          accuracy: Number(p.accuracy) || 10,
          distanceM: Number(p.distanceM) || 0,
        })),
        status: 'FINALIZADA',
        observacoes: (payloadCompleto as any).observacoes ?? null,
        sincronizado: false,
      });
    } catch (storeErr) {
      console.warn('Falha ao salvar no store de rotas offline:', storeErr);
    }

    // 2. Atualiza a lista de resumos na tela e no cache local imediatamente (Optimistic UI)
    const { posicoes, ...resumo } = payloadCompleto;
    const novos = [resumo as VisitasTrajetoResumo, ...trajetos.filter((t) => t.id !== novoId)];
    setTrajetos(novos);
    await visitasOfflineService.setTrajetos(novos);

    // 3. Tenta sincronizar com Supabase se online; se offline/erro, enfileira na fila de sync
    if (navigator.onLine) {
      try {
        const payloadLimpo = limparPayloadParaTabela('visitas_trajetos', payloadCompleto);
        const { error } = await (supabase as any)
          .from('visitas_trajetos')
          .upsert(payloadLimpo, { onConflict: 'id' });
        if (error) throw error;
        toast.success('Trajeto salvo e sincronizado com a nuvem!');
      } catch (err) {
        await visitasOfflineService.enfileirarOperacao(
          'visitas_trajetos',
          'INSERT',
          payloadCompleto,
          novoId
        );
        toast.info('Trajeto salvo no aparelho (aguardando envio para o servidor).');
      }
    } else {
      await visitasOfflineService.enfileirarOperacao(
        'visitas_trajetos',
        'INSERT',
        payloadCompleto,
        novoId
      );
      toast.info('Trajeto gravado no aparelho (modo offline).');
    }
  };

  const handleDeleteTrajeto = async (trajetoId: string) => {
    const confirmou = window.confirm('Deseja excluir este trajeto gravado?');
    if (!confirmou) return;

    const novos = trajetos.filter((t) => t.id !== trajetoId);
    setTrajetos(novos);
    await visitasOfflineService.setTrajetos(novos);

    if (navigator.onLine) {
      await (supabase as any)
        .from('visitas_trajetos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', trajetoId);
    } else {
      await visitasOfflineService.enfileirarOperacao('visitas_trajetos', 'DELETE', {}, trajetoId);
    }
  };

  const handleVerDetalhesTrajeto = async (trajetoId: string): Promise<VisitasTrajeto | null> => {
    // 1. Busca primeiro no IndexedDB local do dispositivo (funciona 100% offline!)
    const trajetoLocal = await visitasOfflineService.obterTrajetoCompletoLocal(trajetoId);
    if (trajetoLocal) {
      return trajetoLocal;
    }

    // 2. Se não estiver no cache local e houver internet, busca do servidor e salva local
    if (navigator.onLine) {
      try {
        const { data, error } = await (supabase as any)
          .from('visitas_trajetos')
          .select('*')
          .eq('id', trajetoId)
          .single();
        if (error) throw error;
        if (data) {
          await visitasOfflineService.salvarTrajetoCompletoLocal(data);
          return data;
        }
      } catch (err) {
        toast.error('Não foi possível carregar o traçado do servidor.');
      }
    } else {
      toast.warning('Traçado detalhado indisponível offline para este registro antigo.');
    }

    return null;
  };

  // --- Salvar / Deletar Mapa GeoPDF ---
  const handleSaveGeoPdf = async (mapaData: Partial<VisitasGeoPdfMap>) => {
    const novoId = mapaData.id ?? crypto.randomUUID();
    const payload: VisitasGeoPdfMap = {
      id: novoId,
      nome: mapaData.nome ?? 'Mapa GeoPDF',
      pdf_url: mapaData.pdf_url ?? '',
      imagem_renderizada_url: mapaData.imagem_renderizada_url ?? null,
      numero_pagina: mapaData.numero_pagina ?? 1,
      pontos_controle: mapaData.pontos_controle ?? [],
      opacidade: mapaData.opacidade ?? 0.7,
      rotacao: mapaData.rotacao ?? 0,
      is_visible: mapaData.is_visible ?? true,
      origem_calibracao: mapaData.origem_calibracao ?? 'manual',
      geo_bounds: mapaData.geo_bounds ?? null,
      usuario_id: funcionario?.id ?? null,
      created_at: new Date().toISOString(),
      deleted_at: null,
    };

    const novos = [payload, ...mapasGeoPdf];
    setMapasGeoPdf(novos);
    await visitasOfflineService.setGeoPdfs(novos);

    if (navigator.onLine) {
      try {
        const payloadLimpo = limparPayloadParaTabela('visitas_mapas_geopdf', payload);
        await (supabase as any)
          .from('visitas_mapas_geopdf')
          .upsert(payloadLimpo, { onConflict: 'id' });
      } catch (err) {}
    }
  };

  const handleDeleteGeoPdf = async (mapaId: string) => {
    const confirmou = window.confirm('Deseja excluir este mapa GeoPDF?');
    if (!confirmou) return;

    const novos = mapasGeoPdf.filter((m) => m.id !== mapaId);
    setMapasGeoPdf(novos);
    await visitasOfflineService.setGeoPdfs(novos);

    if (navigator.onLine) {
      await (supabase as any)
        .from('visitas_mapas_geopdf')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', mapaId);
    }
  };

  const handleToggleVisibilidadeGeoPdf = async (mapa: VisitasGeoPdfMap) => {
    const updated = { ...mapa, is_visible: !mapa.is_visible };
    const novos = mapasGeoPdf.map((m) => (m.id === mapa.id ? updated : m));
    setMapasGeoPdf(novos);
    await visitasOfflineService.setGeoPdfs(novos);

    if (navigator.onLine) {
      await (supabase as any)
        .from('visitas_mapas_geopdf')
        .update({ is_visible: updated.is_visible })
        .eq('id', mapa.id);
    }
  };

  // GeoPDF visível ativo no mapa
  const activeGeoPdf = mapasGeoPdf.find((m) => m.is_visible && !m.deleted_at);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Banner de Sincronização Offline ── */}
      <VisitasOfflineSyncBanner />

      {/* ── Cabeçalho do Módulo ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sidebar-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sidebar-accent border border-sidebar-border text-sidebar-primary flex items-center justify-center shadow-xs">
              <MapPin className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-sidebar-foreground flex items-center gap-2">
                Visitas.
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border">
                  <Sparkles className="w-3 h-3 text-sidebar-primary" />
                  Alpha
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Delimitação de áreas poligonais, marcação de pontos, planejamento de rotas e telemetria GPS 100% offline-first.
              </p>
            </div>
          </div>
        </div>

        {/* Indicadores rápidos de topo e Ações Offline */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setModalDownloadMapaAberto(true)}
            className="px-3 py-1.5 rounded-xl bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            title="Baixar quadrículas do mapa para navegar sem internet em campo"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Mapa Offline</span>
          </button>

          <button
            type="button"
            onClick={() => setModalConfigAberto(true)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            title="Configurar tempo de parada e tolerância anti-duplicação de visitas"
          >
            <Sliders className="w-3.5 h-3.5 text-sidebar-primary" />
            <span>Calibrar Visitas</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2 shadow-xs text-slate-800">
            <Pentagon className="w-4 h-4 text-sidebar-primary" />
            <span className="text-slate-500">Áreas:</span>
            <strong className="text-slate-900 font-mono">{areas.filter((a) => !a.deleted_at).length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2 shadow-xs text-slate-800">
            <MapPin className="w-4 h-4 text-rose-500" />
            <span className="text-slate-500">Pins:</span>
            <strong className="text-slate-900 font-mono">{pontos.filter((p) => !p.deleted_at).length}</strong>
          </div>
        </div>
      </div>

      {/* ── Navegação por Abas Modernas ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-sidebar-border scrollbar-none">
        {[
          { id: 'mapa', label: 'Mapa Interativo', icon: MapIcon },
          { id: 'areas', label: `Áreas Delimitadas (${areas.filter((a) => !a.deleted_at).length})`, icon: Pentagon },
          { id: 'pontos', label: `Pontos / Pins (${pontos.filter((p) => !p.deleted_at).length})`, icon: MapPin },
          { id: 'roteiros', label: `Day Planner (${roteiros.filter((r) => !r.deleted_at).length})`, icon: Calendar },
          { id: 'rastreamento', label: 'Rastreamento GPS', icon: Navigation },
          { id: 'historico', label: `Histórico (${trajetos.length})`, icon: Clock },
          { id: 'veiculos', label: `Veículos (${veiculos.filter((v) => !v.deleted_at).length})`, icon: Car },
          { id: 'geopdf', label: `GeoPDF (${mapasGeoPdf.filter((m) => !m.deleted_at).length})`, icon: FileText },
          { id: 'exportar', label: 'Exportar', icon: Download },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-sidebar-primary text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Conteúdo das Abas ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-xs text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          Carregando módulo de inteligência geográfica...
        </div>
      ) : (
        <>
          {/* Aba 1: Mapa Interativo */}
          {activeTab === 'mapa' && (
            <div className="space-y-3">
              <VisitasDrawingToolbar
                mode={drawMode}
                setMode={setDrawMode}
                draftVertices={draftVertices}
                onUndoVertex={handleUndoVertex}
                onClearDraft={handleClearDraft}
                onFinishPolygon={handleFinishDraftPolygon}
                onLocateMe={handleLocateMe}
                selectedArea={selectedAreaOnToolbar}
                onUpdateAreaStatus={handleUpdateAreaStatus}
                onClearSelectedArea={() => setSelectedAreaOnToolbar(null)}
                onMarcarVisitaImediata={handleMarcarVisitaImediataNoGps}
              />

              <VisitasMapCore
                center={mapCenter}
                zoom={mapZoom}
                mode={drawMode}
                draftVertices={draftVertices}
                onAddDraftVertex={handleAddDraftVertex}
                onFinishDraftPolygon={handleFinishDraftPolygon}
                onPointMapClick={handlePointMapClick}
                areas={areas}
                pontos={pontos}
                activeGeoPdf={activeGeoPdf}
                userLocation={userLocation}
                onSelectArea={(a) => setSelectedAreaOnToolbar(a)}
                onUpdateAreaStatus={handleUpdateAreaStatus}
                onEditArea={(a) => {
                  setAreaEmEdicao(a);
                  setModalAreaAberto(true);
                }}
                onDeleteArea={handleDeleteArea}
              />
            </div>
          )}

          {/* Aba 2: Áreas Delimitadas */}
          {activeTab === 'areas' && (
            <VisitasAreasTab
              areas={areas}
              onNewArea={() => {
                setDraftVertices([]);
                setDrawMode('draw_polygon');
                setActiveTab('mapa');
                toast.info('Clique no mapa para marcar os vértices do perímetro da nova área.');
              }}
              onEditArea={(a) => {
                setAreaEmEdicao(a);
                setModalAreaAberto(true);
              }}
              onDeleteArea={handleDeleteArea}
              onSelectAreaOnMap={(a) => {
                if (a.vertices && a.vertices.length > 0) {
                  setMapCenter(a.vertices[0]);
                  setMapZoom(16);
                  setActiveTab('mapa');
                }
              }}
            />
          )}

          {/* Aba 3: Pontos / Pins */}
          {activeTab === 'pontos' && (
            <VisitasPontosTab
              pontos={pontos}
              areas={areas}
              onNewPonto={() => {
                setDrawMode('add_point');
                setActiveTab('mapa');
                toast.info('Clique no mapa no local onde deseja posicionar o novo ponto.');
              }}
              onEditPonto={(p) => {
                setPontoEmEdicao(p);
                setModalPontoAberto(true);
              }}
              onDeletePonto={handleDeletePonto}
              onSelectPontoOnMap={(p) => {
                setMapCenter([Number(p.latitude), Number(p.longitude)]);
                setMapZoom(17);
                setActiveTab('mapa');
              }}
            />
          )}

          {/* Aba 4: Day Planner / Roteiros */}
          {activeTab === 'roteiros' && (
            <VisitasRoteirosTab
              roteiros={roteiros}
              areas={areas}
              veiculos={veiculos}
              onSaveRoteiro={handleSaveRoteiro}
              onDeleteRoteiro={handleDeleteRoteiro}
              onStartTrackingRoteiro={(rot) => {
                setRoteiroParaRastrear(rot);
                setActiveTab('rastreamento');
                toast.success(`Roteiro "${rot.nome}" pronto para navegação!`);
              }}
            />
          )}

          {/* Aba 5: Rastreamento GPS ao Vivo */}
          {activeTab === 'rastreamento' && (
            <VisitasNavegacaoLiveTab
              areas={areas}
              veiculos={veiculos}
              roteiroAtivo={roteiroParaRastrear}
              onSalvarTrajeto={handleSaveTrajeto}
            />
          )}

          {/* Aba 6: Histórico de Trajetos */}
          {activeTab === 'historico' && (
            <VisitasHistoricoTrajetosTab
              trajetos={trajetos}
              veiculos={veiculos}
              onDeleteTrajeto={handleDeleteTrajeto}
              onVerDetalhesTrajeto={handleVerDetalhesTrajeto}
            />
          )}

          {/* Aba 7: Veículos de Campo */}
          {activeTab === 'veiculos' && (
            <VisitasVeiculosTab
              veiculos={veiculos}
              onSaveVeiculo={handleSaveVeiculo}
              onDeleteVeiculo={handleDeleteVeiculo}
            />
          )}

          {/* Aba 8: GeoPDF Mapas */}
          {activeTab === 'geopdf' && (
            <VisitasGeoPdfTab
              mapas={mapasGeoPdf}
              onSaveMapa={handleSaveGeoPdf}
              onDeleteMapa={handleDeleteGeoPdf}
              onToggleVisibilidade={handleToggleVisibilidadeGeoPdf}
            />
          )}

          {/* Aba 9: Central de Exportação */}
          {activeTab === 'exportar' && (
            <VisitasExportPanel
              areas={areas}
              pontos={pontos}
              trajetos={trajetos as any}
              veiculos={veiculos}
            />
          )}
        </>
      )}

      {/* ── Modais de Edição Globais ── */}
      <VisitasAreaEditorModal
        open={modalAreaAberto}
        onOpenChange={setModalAreaAberto}
        area={areaEmEdicao}
        onSave={handleSaveArea}
      />

      <VisitasPontoModal
        open={modalPontoAberto}
        onOpenChange={setModalPontoAberto}
        ponto={pontoEmEdicao}
        areas={areas}
        onSave={handleSavePonto}
      />

      {/* Modal de Calibração de Sensibilidade & Anti-Duplicação */}
      <VisitasConfigModal
        open={modalConfigAberto}
        onOpenChange={setModalConfigAberto}
      />

      {/* Modal de Download de Mapas Offline */}
      <VisitasDownloadMapaModal
        open={modalDownloadMapaAberto}
        onOpenChange={setModalDownloadMapaAberto}
        currentMapCenter={mapCenter}
      />
    </div>
  );
}
