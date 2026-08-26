'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { visitasOfflineService } from '@/lib/visitas/visitasOfflineService';
import { toast } from 'sonner';

export function VisitasOfflineSyncBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [itensPendentes, setItensPendentes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [descartando, setDescartando] = useState(false);

  const checarFila = async () => {
    try {
      const qtd = await visitasOfflineService.contarItensPendentes();
      setItensPendentes(qtd);
    } catch {}
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      checarFila();

      const handleOnline = () => {
        setIsOnline(true);
        checarFila();
      };
      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      const interval = setInterval(checarFila, 5000);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
      };
    }
  }, []);

  const handleSincronizar = async () => {
    if (!navigator.onLine) {
      toast.warning('Você está offline. Conecte-se à internet para sincronizar.');
      return;
    }

    setSincronizando(true);
    try {
      const res = await visitasOfflineService.sincronizarTudo({ forcar: true });
      await checarFila();
      
      if (res.sincronizados > 0) {
        toast.success(`${res.sincronizados} registro(s) sincronizado(s) com o servidor com sucesso!`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sig_visitas_dados_atualizados'));
        }
      } else if (res.erros > 0) {
        toast.error(`Falha ao sincronizar ${res.erros} item(ns). Verifique se os dados estão completos e tente novamente.`);
      } else {
        toast.info('Tudo atualizado! Nenhuma alteração pendente para sincronizar.');
      }
    } catch (err) {
      toast.error('Erro ao sincronizar dados com o servidor.');
    } finally {
      setSincronizando(false);
    }
  };

  const handleDescartarPendentes = async () => {
    const confirmou = window.confirm(
      'Deseja realmente excluir/descartar os itens pendentes da fila local? Essas alterações não sincronizadas serão removidas permanentemente do seu dispositivo.'
    );
    if (!confirmou) return;

    setDescartando(true);
    try {
      await visitasOfflineService.limparFilaPendentes();
      await checarFila();
      toast.success('Itens pendentes removidos da fila local com sucesso!');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sig_visitas_dados_atualizados'));
      }
    } catch (err) {
      toast.error('Erro ao descartar itens pendentes da fila local.');
    } finally {
      setDescartando(false);
    }
  };

  if (isOnline && itensPendentes === 0) {
    return null;
  }

  return (
    <div className="bg-card dark:bg-[#141416] border border-border dark:border-[#26262a] px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-2.5 text-xs flex-wrap">
        {isOnline ? (
          <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
            <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Online
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
            Modo Offline Ativo (Operando localmente)
          </span>
        )}

        {itensPendentes > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
            <AlertCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            {itensPendentes} item(ns) pendente(s) de envio
          </span>
        )}
      </div>

      {itensPendentes > 0 && (
        <div className="flex items-center gap-2">
          {/* Botão de Excluir / Descartar Pendências */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDescartarPendentes}
            disabled={descartando || sincronizando}
            className="h-7 text-xs font-semibold gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 dark:border-destructive/40 shadow-xs cursor-pointer"
            title="Excluir alterações pendentes acumuladas localmente"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir Pendência{itensPendentes > 1 ? 's' : ''}</span>
          </Button>

          {/* Botão de Sincronizar Agora */}
          {isOnline && (
            <Button
              size="sm"
              onClick={handleSincronizar}
              disabled={sincronizando || descartando}
              className="h-7 text-xs font-bold gap-1.5 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${sincronizando ? 'animate-spin' : ''}`} />
              Sincronizar Agora
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
