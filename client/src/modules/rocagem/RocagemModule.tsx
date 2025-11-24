import { useEffect } from 'react';
import { QuickRegisterModal } from '@/components/QuickRegisterModal';
import { ManualForecastModal } from '@/components/ManualForecastModal';
import { NewAreaModal } from '@/components/NewAreaModal';
import { EditAreaModal } from '@/components/EditAreaModal';
import { MapInfoCard } from '@/components/MapInfoCard';
import { useRocagemState } from './hooks';
import type { RocagemModuleProps } from './types';

/**
 * RocagemModule - Módulo Isolado para "Capina e Roçagem"
 * 
 * IMPORTANTE: Este módulo encapsula TODOS os estados e componentes específicos de Roçagem.
 * Quando desmontado, o hook useRocagemState executa cleanup automático via reset().
 * 
 * O prop 'key' no Dashboard força React a desmontar completamente este módulo
 * ao trocar para outro serviço, garantindo zero poluição de estado.
 */
export function RocagemModule({ rocagemAreas }: RocagemModuleProps) {
  const state = useRocagemState();

  // Cleanup automático ao desmontar (quando usuário troca de módulo)
  useEffect(() => {
    return () => {
      state.reset();
    };
  }, [state]);

  return (
    <>
      {/* Card flutuante quando uma área é selecionada no mapa */}
      {state.showMapCard && state.selectedArea && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
          <MapInfoCard
            area={state.selectedArea}
            onClose={() => {
              state.setShowMapCard(false);
              state.setSelectedArea(null);
            }}
            onRegisterMowing={() => {
              state.setShowMapCard(false);
              state.setShowQuickRegisterModal(true);
            }}
            onSetManualForecast={() => {
              state.setShowMapCard(false);
              state.setShowManualForecastModal(true);
            }}
            onEdit={() => {
              state.setShowMapCard(false);
              state.setShowEditModal(true);
            }}
          />
        </div>
      )}

      {/* Modais específicos do módulo Roçagem */}
      <QuickRegisterModal
        area={state.selectedArea}
        open={state.showQuickRegisterModal}
        onOpenChange={(open) => {
          state.setShowQuickRegisterModal(open);
          if (!open) {
            state.reset();
          }
        }}
      />

      <ManualForecastModal
        area={state.selectedArea}
        open={state.showManualForecastModal}
        onOpenChange={(open) => {
          state.setShowManualForecastModal(open);
          if (!open) {
            state.setShowManualForecastModal(false);
          }
        }}
      />

      {state.newAreaCoords && (
        <NewAreaModal
          open={state.showNewAreaModal}
          lat={state.newAreaCoords.lat}
          lng={state.newAreaCoords.lng}
          onOpenChange={(open) => {
            state.setShowNewAreaModal(open);
            if (!open) {
              state.setNewAreaCoords(null);
            }
          }}
        />
      )}

      <EditAreaModal
        area={state.selectedArea}
        open={state.showEditModal}
        onOpenChange={(open) => {
          state.setShowEditModal(open);
          if (!open) {
            state.setSelectedArea(null);
          }
        }}
      />
    </>
  );
}
