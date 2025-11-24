import { useState, useCallback } from 'react';
import type { ServiceArea } from '@shared/schema';

export function useJardinsState() {
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [showMapCard, setShowMapCard] = useState(false);
  const [showJardinsRegisterModal, setShowJardinsRegisterModal] = useState(false);
  const [showNewAreaModal, setShowNewAreaModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newAreaCoords, setNewAreaCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  // Função de reset: chamada quando o módulo desmonta
  const reset = useCallback(() => {
    setSelectedArea(null);
    setShowMapCard(false);
    setShowJardinsRegisterModal(false);
    setShowNewAreaModal(false);
    setShowEditModal(false);
    setNewAreaCoords(null);
  }, []);

  return {
    // Estados
    selectedArea,
    setSelectedArea,
    showMapCard,
    setShowMapCard,
    showJardinsRegisterModal,
    setShowJardinsRegisterModal,
    showNewAreaModal,
    setShowNewAreaModal,
    showEditModal,
    setShowEditModal,
    newAreaCoords,
    setNewAreaCoords,
    // Funções de reset
    reset,
  };
}
