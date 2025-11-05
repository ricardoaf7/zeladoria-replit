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
import { CalendarIcon, CheckCircle2 } from "lucide-react";
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
}

export function QuickRegisterModal({ area, open, onOpenChange }: QuickRegisterModalProps) {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [inputValue, setInputValue] = useState<string>("");

  // Resetar data para hoje quando modal fechar
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDate(new Date()); // Reset para hoje ao fechar
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

  // Processar entrada manual de data - mantém texto do usuário
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
        // Ignora erro de parse, mantém texto do usuário
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
        // Data inválida, resetar para data atual
        setInputValue(format(date, "dd/MM/yyyy"));
      }
    } catch (e) {
      setInputValue(format(date, "dd/MM/yyyy"));
    }
  };

  const registerMowingMutation = useMutation({
    mutationFn: async (data: { date: string }): Promise<ServiceArea> => {
      if (!area) throw new Error("Área não selecionada");
      
      const res = await apiRequest("PATCH", `/api/areas/${area.id}`, {
        ultimaRocagem: data.date,
        status: "Pendente",
      });
      return await res.json() as ServiceArea;
    },
    onSuccess: (updatedArea) => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas/rocagem"] });
      queryClient.invalidateQueries({ queryKey: ["/api/areas/jardins"] });
      
      // Atualizar área no cache imediatamente para reflexão instantânea na UI
      queryClient.setQueryData(["/api/areas/rocagem"], (old: ServiceArea[] | undefined) => {
        if (!old) return old;
        return old.map(a => a.id === updatedArea.id ? updatedArea : a);
      });
      
      toast({
        title: "Roçagem Registrada!",
        description: `Roçagem de ${area?.endereco} registrada com sucesso.`,
      });
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
          <div className="space-y-2">
            <Label htmlFor="date-input">Data da Roçagem</Label>
            
            {/* Input manual de data */}
            <div className="relative">
              <Input
                id="date-input"
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
                data-testid="input-date-manual"
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
              Digite manualmente ou clique no calendário. Padrão: hoje ({format(new Date(), "dd/MM/yyyy")})
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
