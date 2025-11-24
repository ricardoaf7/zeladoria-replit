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
import { CalendarIcon, Calendar as CalendarCheckIcon } from "lucide-react";
import { format, parse, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ServiceArea } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ManualForecastModalProps {
  area: ServiceArea | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualForecastModal({ area, open, onOpenChange }: ManualForecastModalProps) {
  const { toast } = useToast();
  // Default: 60 dias no futuro
  const [date, setDate] = useState<Date>(addDays(new Date(), 60));
  const [inputValue, setInputValue] = useState<string>("");

  // Resetar data quando modal fechar
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDate(addDays(new Date(), 60)); // Reset para +60 dias ao fechar
      setInputValue(""); // Limpar input
    }
    onOpenChange(newOpen);
  };

  // Atualizar input quando data muda via calendário
  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      setInputValue(format(newDate, "dd/MM/yyyy"));
    }
  };

  // Processar entrada manual de data
  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    // Tentar parsear a data (formato dd/MM/yyyy)
    if (value.length === 10) {
      try {
        const parsedDate = parse(value, "dd/MM/yyyy", new Date());
        if (!isNaN(parsedDate.getTime())) {
          setDate(parsedDate);
        }
      } catch (e) {
        // Ignora erro de parse
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
      const parsedDate = parse(inputValue, "dd/MM/yyyy", new Date());
      if (!isNaN(parsedDate.getTime())) {
        setDate(parsedDate);
        setInputValue(format(parsedDate, "dd/MM/yyyy"));
      } else {
        setInputValue(format(date, "dd/MM/yyyy"));
      }
    } catch (e) {
      setInputValue(format(date, "dd/MM/yyyy"));
    }
  };

  const setManualForecastMutation = useMutation({
    mutationFn: async (data: { date: string }): Promise<ServiceArea> => {
      if (!area) throw new Error("Área não selecionada");
      
      const res = await apiRequest("PATCH", `/api/areas/${area.id}/manual-forecast`, {
        proximaPrevisao: data.date,
      });
      return await res.json() as ServiceArea;
    },
    onSuccess: (updatedArea) => {
      // Atualizar cache local para resposta instantânea
      queryClient.setQueryData(["/api/areas/light", "rocagem"], (old: ServiceArea[] | undefined) => {
        if (!old) return old;
        return old.map(a => a.id === updatedArea.id ? updatedArea : a);
      });
      
      toast({
        title: "Previsão Manual Definida!",
        description: `Previsão de ${area?.endereco} atualizada para ${format(date, "dd/MM/yyyy")}.`,
      });
      handleOpenChange(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao Definir Previsão",
        description: "Não foi possível definir a previsão manual. Tente novamente.",
      });
    },
  });

  const handleConfirm = () => {
    const dateStr = format(date, "yyyy-MM-dd");
    setManualForecastMutation.mutate({ date: dateStr });
  };

  if (!area) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-manual-forecast">
        <DialogHeader>
          <DialogTitle className="text-lg">Definir Previsão Manual</DialogTitle>
          <DialogDescription className="text-sm">
            {area.endereco}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="forecast-date-input">Data da Próxima Roçagem</Label>
            
            {/* Input manual de data */}
            <div className="relative">
              <Input
                id="forecast-date-input"
                type="text"
                placeholder="dd/mm/aaaa"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleInputBlur}
                onFocus={() => {
                  if (!inputValue) {
                    setInputValue(format(date, "dd/MM/yyyy"));
                  }
                }}
                className="pr-10"
                data-testid="input-forecast-date-manual"
                autoFocus
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    data-testid="button-forecast-date-picker"
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
              Esta previsão substituirá o cálculo automático de 60 dias.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="flex-1"
            data-testid="button-cancel-forecast"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={setManualForecastMutation.isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            data-testid="button-confirm-forecast"
          >
            <CalendarCheckIcon className="h-4 w-4 mr-2" />
            {setManualForecastMutation.isPending ? "Salvando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
