import type { ServiceArea } from '@shared/schema';
import type L from 'leaflet';

export interface RocagemModuleProps {
  rocagemAreas: ServiceArea[];
  mapRef?: React.MutableRefObject<L.Map | null>;
}

export interface RocagemModuleState {
  selectedArea: ServiceArea | null;
  setSelectedArea: (area: ServiceArea | null) => void;
  showMapCard: boolean;
  setShowMapCard: (show: boolean) => void;
  showQuickRegisterModal: boolean;
  setShowQuickRegisterModal: (show: boolean) => void;
  showManualForecastModal: boolean;
  setShowManualForecastModal: (show: boolean) => void;
  showNewAreaModal: boolean;
  setShowNewAreaModal: (show: boolean) => void;
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  newAreaCoords: { lat: number; lng: number } | null;
  setNewAreaCoords: (coords: { lat: number; lng: number } | null) => void;
  reset: () => void;
}
