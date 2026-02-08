import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MapPin } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NewAreaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lat: number;
  lng: number;
  defaultServico?: "rocagem" | "jardins";
}

const newAreaSchema = z.object({
  tipo: z.string().min(1, "Tipo é obrigatório"),
  endereco: z.string().min(1, "Endereço é obrigatório"),
  bairro: z.string().optional(),
  metragem_m2: z.string().optional(),
  lote: z.string().min(1, "Selecione um lote"),
  servico: z.enum(["rocagem", "jardins"]).default("rocagem"),
});

type NewAreaFormData = z.infer<typeof newAreaSchema>;

export function NewAreaModal({ open, onOpenChange, lat, lng, defaultServico = "rocagem" }: NewAreaModalProps) {
  const { toast } = useToast();
  
  const form = useForm<NewAreaFormData>({
    resolver: zodResolver(newAreaSchema),
    defaultValues: {
      tipo: "area publica",
      endereco: "",
      bairro: "",
      metragem_m2: "",
      lote: "1",
      servico: defaultServico,
    },
  });

  // Buscar endereço automaticamente via reverse geocoding
  useEffect(() => {
    if (!open || !lat || !lng) return;

    const fetchAddress = async () => {
      try {
        const response = await fetch(
          `/api/geocode/reverse?lat=${lat}&lng=${lng}`
        );
        if (response.ok) {
          const data = await response.json();
          const address = data.address || {};
          
          // Extrair informações do endereço
          const road = address.road || address.street || "";
          const suburb = address.suburb || address.neighbourhood || address.quarter || "";
          const houseNumber = address.house_number || "";
          
          const fullAddress = [houseNumber, road]
            .filter(Boolean)
            .join(" ")
            .trim();

          form.setValue("endereco", fullAddress || data.display_name?.split(",")[0] || "");
          form.setValue("bairro", suburb || address.city_district || "");
        }
      } catch (error) {
        console.error("Erro ao buscar endereço:", error);
        toast({
          title: "Aviso",
          description: "Não foi possível buscar o endereço automaticamente. Preencha manualmente.",
          variant: "default",
        });
      }
    };

    fetchAddress();
  }, [open, lat, lng, form, toast]);

  // Resetar formulário ao fechar
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset({
        tipo: "area publica",
        endereco: "",
        bairro: "",
        metragem_m2: "",
        lote: "1",
        servico: defaultServico,
      });
    }
    onOpenChange(newOpen);
  };

  const createAreaMutation = useMutation({
    mutationFn: async (data: NewAreaFormData) => {
      // Sanitizar e transformar dados antes de enviar
      const metragem = data.metragem_m2 && data.metragem_m2.trim() !== "" 
        ? parseFloat(data.metragem_m2) 
        : undefined;
      
      const lote = parseInt(data.lote);
      
      // Validar valores transformados
      if (metragem !== undefined && (isNaN(metragem) || metragem <= 0)) {
        throw new Error("Metragem deve ser um número positivo");
      }
      
      if (isNaN(lote) || lote < 1 || lote > 2) {
        throw new Error("Lote deve ser 1 ou 2");
      }
      
      return await apiRequest("POST", "/api/areas", {
        tipo: data.tipo,
        endereco: data.endereco,
        bairro: data.bairro || undefined,
        metragem_m2: metragem,
        lat,
        lng,
        lote,
        servico: data.servico,
        status: "Pendente",
      });
    },
    onSuccess: (newArea) => {
      // Invalidar cache de todas as áreas (rocagem e jardins)
      queryClient.invalidateQueries({ queryKey: ["/api/areas/light"] });
      queryClient.invalidateQueries({ queryKey: ["/api/areas"] });
      toast({
        title: "Área Cadastrada",
        description: `Área "${form.getValues("endereco")}" foi cadastrada com sucesso!`,
      });
      handleOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao Cadastrar",
        description: error.message || "Não foi possível cadastrar a área.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NewAreaFormData) => {
    createAreaMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] z-[9999]" data-testid="modal-new-area">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Cadastrar Nova Área
          </DialogTitle>
          <DialogDescription>
            Preencha as informações da área de serviço que será cadastrada no sistema.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Coordenadas (readonly) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <FormLabel htmlFor="lat">Latitude</FormLabel>
                <Input
                  id="lat"
                  value={lat.toFixed(7)}
                  readOnly
                  className="bg-muted"
                  data-testid="input-lat"
                />
              </div>
              <div className="space-y-2">
                <FormLabel htmlFor="lng">Longitude</FormLabel>
                <Input
                  id="lng"
                  value={lng.toFixed(7)}
                  readOnly
                  className="bg-muted"
                  data-testid="input-lng"
                />
              </div>
            </div>

            {/* Endereço */}
            <FormField
              control={form.control}
              name="endereco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Av. Jorge Casoni, 123"
                      {...field}
                      data-testid="input-endereco"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bairro */}
            <FormField
              control={form.control}
              name="bairro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Centro"
                      {...field}
                      data-testid="input-bairro"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo e Lote */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-tipo">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="area publica">Área Pública</SelectItem>
                        <SelectItem value="praça">Praça</SelectItem>
                        <SelectItem value="canteiro">Canteiro</SelectItem>
                        <SelectItem value="rotatória">Rotatória</SelectItem>
                        <SelectItem value="jardim">Jardim</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lote</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-lote">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Lote 1</SelectItem>
                        <SelectItem value="2">Lote 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Metragem */}
            <FormField
              control={form.control}
              name="metragem_m2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metragem (m²)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 1500.50"
                      {...field}
                      data-testid="input-metragem"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createAreaMutation.isPending}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createAreaMutation.isPending}
                data-testid="button-submit"
              >
                {createAreaMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  "Cadastrar Área"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
