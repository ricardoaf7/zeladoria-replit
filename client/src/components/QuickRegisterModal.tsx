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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
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

  // Resetar data para hoje quando modal fechar
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDate(new Date()); // Reset para hoje ao fechar
    }
    onOpenChange(newOpen);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas/rocagem"] });
      queryClient.invalidateQueries({ queryKey: ["/api/areas/jardins"] });
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
            <Label htmlFor="date-picker">Data da Roçagem</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-picker"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-10",
                    !date && "text-muted-foreground"
                  )}
                  data-testid="button-date-picker"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Padrão: hoje ({format(new Date(), "dd/MM/yyyy")})
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
