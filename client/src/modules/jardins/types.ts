import type { ServiceArea } from '@shared/schema';

export interface JardinsModuleProps {
  jardinsAreas: ServiceArea[];
}

export interface JardinsModuleState {
  selectedArea: ServiceArea | null;
  setSelectedArea: (area: ServiceArea | null) => void;
  showMapCard: boolean;
  setShowMapCard: (show: boolean) => void;
  showJardinsRegisterModal: boolean;
  setShowJardinsRegisterModal: (show: boolean) => void;
  showNewAreaModal: boolean;
  setShowNewAreaModal: (show: boolean) => void;
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  newAreaCoords: { lat: number; lng: number } | null;
  setNewAreaCoords: (coords: { lat: number; lng: number } | null) => void;
  reset: () => void;
}
