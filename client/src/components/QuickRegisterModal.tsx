import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle2, Camera, X } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ServiceArea } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QuickRegisterModalProps {
  area: ServiceArea | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapRef?: React.MutableRefObject<any | null>;
  savedMapZoom?: number | null;
  savedMapCenter?: { lat: number; lng: number } | null;
  onRestoreMapZoom?: () => void;
}

export function QuickRegisterModal({ 
  area, 
  open, 
  onOpenChange,
  mapRef,
  savedMapZoom,
  savedMapCenter,
  onRestoreMapZoom
}: QuickRegisterModalProps) {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [inputValue, setInputValue] = useState<string>("");
  const [fotoAntes, setFotoAntes] = useState<string | null>(null);
  const [fotoDepois, setFotoDepois] = useState<string | null>(null);
  const [uploadingAntes, setUploadingAntes] = useState(false);
  const [uploadingDepois, setUploadingDepois] = useState(false);

  // Resetar data para hoje quando modal fechar e restaurar zoom do mapa
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDate(new Date()); // Reset para hoje ao fechar
      setInputValue(""); // Limpar input
      setFotoAntes(null);
      setFotoDepois(null);
      
      // Restaurar zoom e centro do mapa para posição salva
      if (mapRef?.current && savedMapZoom && savedMapCenter) {
        setTimeout(() => {
          mapRef.current?.setView([savedMapCenter.lat, savedMapCenter.lng], savedMapZoom, { animate: false });
        }, 50);
      }
    }
    onOpenChange(newOpen);
  };

  const handlePhotoCapture = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setPhoto: (url: string) => void,
    setUploading: (val: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/photo/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Falha ao fazer upload");
      const data = await res.json() as { url: string };
      setPhoto(data.url);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro no Upload",
        description: "Não foi possível fazer upload da foto.",
      });
    } finally {
      setUploading(false);
    }
  };

  // Atualizar input quando data muda via calendário
  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      setInputValue(format(newDate, "dd/MM/yyyy"));
    }
  };

  // Formatar entrada de data automaticamente - aceita apenas números
  // Exemplo: "301025" → "30/10/2025"
  const formatDateInput = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 8 dígitos (ddmmaaaa)
    const limited = numbers.slice(0, 8);
    
    // Adiciona barras nas posições corretas
    let formatted = '';
    for (let i = 0; i < limited.length; i++) {
      if (i === 2 || i === 4) {
        formatted += '/';
      }
      formatted += limited[i];
    }
    
    return formatted;
  };

  // Processar entrada manual de data com formatação automática
  const handleInputChange = (value: string) => {
    const formatted = formatDateInput(value);
    setInputValue(formatted);
    
    // Tentar parsear a data (formato dd/MM/yyyy ou dd/MM/yy)
    if (formatted.length >= 8) {
      try {
        let dateStr = formatted;
        
        // Se ano tem apenas 2 dígitos, completar para 4
        // Exemplo: "30/10/25" → "30/10/2025"
        if (formatted.length === 8) { // dd/MM/yy
          const parts = formatted.split('/');
          if (parts.length === 3 && parts[2].length === 2) {
            const year = parseInt(parts[2]);
            const fullYear = year < 50 ? 2000 + year : 1900 + year;
            dateStr = `${parts[0]}/${parts[1]}/${fullYear}`;
          }
        }
        
        const parsedDate = parse(dateStr, "dd/MM/yyyy", new Date());
        if (!isNaN(parsedDate.getTime())) {
          setDate(parsedDate);
        }
      } catch (e) {
        // Ignora erro de parse, mantém texto formatado
      }
    }
  };

  // Quando input perde foco, formatar ou resetar
  const handleInputBlur = () => {
    if (!inputValue) {
      setInputValue(format(date, "dd/MM/yyyy"));
      return;
    }
    
    try {
      let dateStr = inputValue;
      
      // Se ano tem apenas 2 dígitos (formato dd/MM/yy), completar para 4
      if (inputValue.length === 8) { // dd/MM/yy
        const parts = inputValue.split('/');
        if (parts.length === 3 && parts[2].length === 2) {
          const year = parseInt(parts[2]);
          const fullYear = year < 50 ? 2000 + year : 1900 + year;
          dateStr = `${parts[0]}/${parts[1]}/${fullYear}`;
        }
      }
      
      const parsedDate = parse(dateStr, "dd/MM/yyyy", new Date());
      if (!isNaN(parsedDate.getTime())) {
        setDate(parsedDate);
        setInputValue(format(parsedDate, "dd/MM/yyyy"));
      } else {
        // Data inválida ou incompleta, resetar para HOJE
        const today = new Date();
        setDate(today);
        setInputValue(format(today, "dd/MM/yyyy"));
      }
    } catch (e) {
      // Erro no parse, resetar para HOJE
      const today = new Date();
      setDate(today);
      setInputValue(format(today, "dd/MM/yyyy"));
    }
  };

  const registerMowingMutation = useMutation({
    mutationFn: async (data: { date: string }): Promise<ServiceArea> => {
      if (!area) throw new Error("Área não selecionada");
      
      const res = await apiRequest("PATCH", `/api/areas/${area.id}`, {
        ultimaRocagem: data.date,
        status: "Pendente",
        fotoAntes: fotoAntes || null,
        fotoDepois: fotoDepois || null,
      });
      return await res.json() as ServiceArea;
    },
    onSuccess: (updatedArea) => {
      if (!area) return; // Safety check
      
      // Atualizar cache de áreas leves (preserva zoom do mapa)
      queryClient.setQueryData(["/api/areas/light", "rocagem"], (old: ServiceArea[] | undefined) => {
        if (!old) return old;
        return old.map(a => a.id === updatedArea.id ? updatedArea : a);
      });
      
      // Atualizar cache da área individual localmente (sem invalidar para preservar zoom)
      queryClient.setQueryData(["/api/areas", area.id], updatedArea);
      
      toast({
        title: "Roçagem Registrada!",
        description: `Roçagem de ${area.endereco} registrada com sucesso.`,
      });
      
      // Manter zoom atual no bairro - não restaurar zoom anterior
      // O mapa permanece na mesma posição para facilitar registros consecutivos
      
      handleOpenChange(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao Registrar",
        description: "Não foi possível registrar a roçagem. Tente novamente.",
      });
    },
  });

  const handleConfirm = () => {
    const dateStr = format(date, "yyyy-MM-dd");
    registerMowingMutation.mutate({ date: dateStr });
  };

  if (!area) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-quick-register">
        <DialogHeader>
          <DialogTitle className="text-lg">Registrar Roçagem</DialogTitle>
          <DialogDescription className="text-sm">
            {area.endereco}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Fotos (opcional)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="border-2 border-dashed rounded-lg p-2">
                  {fotoAntes ? (
                    <div className="relative">
                      <img src={fotoAntes} alt="Antes" className="w-full h-20 object-cover rounded" />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-0 right-0 h-5 w-5"
                        onClick={() => setFotoAntes(null)}
                        data-testid="button-remove-foto-antes"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-20 cursor-pointer hover:bg-muted">
                      <Camera className="h-4 w-4 mb-1" />
                      <span className="text-xs text-center">Antes</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoCapture(e, setFotoAntes, setUploadingAntes)}
                        disabled={uploadingAntes}
                        data-testid="input-foto-antes"
                      />
                    </label>
                  )}
                </div>

                <div className="border-2 border-dashed rounded-lg p-2">
                  {fotoDepois ? (
                    <div className="relative">
                      <img src={fotoDepois} alt="Depois" className="w-full h-20 object-cover rounded" />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-0 right-0 h-5 w-5"
                        onClick={() => setFotoDepois(null)}
                        data-testid="button-remove-foto-depois"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-20 cursor-pointer hover:bg-muted">
                      <Camera className="h-4 w-4 mb-1" />
                      <span className="text-xs text-center">Depois</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoCapture(e, setFotoDepois, setUploadingDepois)}
                        disabled={uploadingDepois}
                        data-testid="input-foto-depois"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-input">Data da Roçagem</Label>
            
            {/* Input manual de data */}
            <div className="relative">
              <Input
                id="date-input"
                type="text"
                placeholder="Digite apenas números: 301025"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleInputBlur}
                onFocus={() => {
                  if (!inputValue) {
                    setInputValue(format(date, "dd/MM/yyyy"));
                  }
                }}
                className="pr-10"
                data-testid="input-date-manual"
                autoFocus
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    data-testid="button-date-picker"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                    locale={ptBR}
                    captionLayout="dropdown-buttons"
                    fromYear={2020}
                    toYear={2030}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Digite apenas números (ex: 301025 vira 30/10/2025) ou use o calendário. Padrão: hoje
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="flex-1"
            data-testid="button-cancel-register"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={registerMowingMutation.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700"
            data-testid="button-confirm-register"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {registerMowingMutation.isPending ? "Salvando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
