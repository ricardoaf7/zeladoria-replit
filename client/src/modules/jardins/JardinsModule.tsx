import { useEffect } from 'react';
import { JardinsRegisterModal } from '@/components/JardinsRegisterModal';
import { NewAreaModal } from '@/components/NewAreaModal';
import { EditAreaModal } from '@/components/EditAreaModal';
import { MapInfoCard } from '@/components/MapInfoCard';
import { useJardinsState } from './hooks';
import type { JardinsModuleProps } from './types';

/**
 * JardinsModule - Módulo Isolado para "Jardins"
 * 
 * IMPORTANTE: Este módulo encapsula TODOS os estados e componentes específicos de Jardins.
 * Quando desmontado, o hook useJardinsState executa cleanup automático via reset().
 * 
 * O prop 'key' no Dashboard força React a desmontar completamente este módulo
 * ao trocar para outro serviço, garantindo zero poluição de estado.
 */
export function JardinsModule({ jardinsAreas }: JardinsModuleProps) {
  const state = useJardinsState();

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
              state.setShowJardinsRegisterModal(true);
            }}
            onRegisterJardins={() => {
              state.setShowMapCard(false);
              state.setShowJardinsRegisterModal(true);
            }}
            onSetManualForecast={() => {
              state.setShowMapCard(false);
            }}
            onEdit={() => {
              state.setShowMapCard(false);
              state.setShowEditModal(true);
            }}
          />
        </div>
      )}

      {/* Modais específicos do módulo Jardins */}
      <JardinsRegisterModal
        area={state.selectedArea}
        open={state.showJardinsRegisterModal}
        onOpenChange={(open) => {
          state.setShowJardinsRegisterModal(open);
          if (!open) {
            state.reset();
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
