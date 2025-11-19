import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
}

export function NewAreaModal({ open, onOpenChange, lat, lng }: NewAreaModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    tipo: "area publica",
    endereco: "",
    bairro: "",
    metragem_m2: "",
    lote: "1",
  });
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Buscar endereço automaticamente via reverse geocoding
  useEffect(() => {
    if (!open || !lat || !lng) return;

    const fetchAddress = async () => {
      setIsLoadingAddress(true);
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

          setFormData(prev => ({
            ...prev,
            endereco: fullAddress || data.display_name?.split(",")[0] || "",
            bairro: suburb || address.city_district || "",
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar endereço:", error);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    fetchAddress();
  }, [open, lat, lng]);

  // Resetar formulário ao fechar
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData({
        tipo: "area publica",
        endereco: "",
        bairro: "",
        metragem_m2: "",
        lote: "1",
      });
    }
    onOpenChange(newOpen);
  };

  const createAreaMutation = useMutation({
    mutationFn: async (data: typeof formData & { lat: number; lng: number }) => {
      return await apiRequest("POST", "/api/areas", {
        tipo: data.tipo,
        endereco: data.endereco,
        bairro: data.bairro || undefined,
        metragem_m2: data.metragem_m2 ? parseFloat(data.metragem_m2) : undefined,
        lat: data.lat,
        lng: data.lng,
        lote: parseInt(data.lote),
        servico: "rocagem",
        status: "Pendente",
      });
    },
    onSuccess: (newArea) => {
      queryClient.invalidateQueries({ queryKey: ["/api/areas/light", "rocagem"] });
      toast({
        title: "Área Cadastrada",
        description: `Área "${formData.endereco}" foi cadastrada com sucesso!`,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.endereco.trim()) {
      toast({
        title: "Endereço Obrigatório",
        description: "Por favor, informe o endereço da área.",
        variant: "destructive",
      });
      return;
    }

    createAreaMutation.mutate({ ...formData, lat, lng });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="modal-new-area">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Cadastrar Nova Área
          </DialogTitle>
          <DialogDescription>
            Preencha as informações da área de serviço que será cadastrada no sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Coordenadas (readonly) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                value={lat.toFixed(7)}
                readOnly
                className="bg-muted"
                data-testid="input-lat"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Longitude</Label>
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
          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço *</Label>
            <Input
              id="endereco"
              placeholder="Ex: Av. Jorge Casoni, 123"
              value={formData.endereco}
              onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
              disabled={isLoadingAddress}
              data-testid="input-endereco"
            />
            {isLoadingAddress && (
              <p className="text-sm text-muted-foreground">
                Buscando endereço automaticamente...
              </p>
            )}
          </div>

          {/* Bairro */}
          <div className="space-y-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input
              id="bairro"
              placeholder="Ex: Centro"
              value={formData.bairro}
              onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
              disabled={isLoadingAddress}
              data-testid="input-bairro"
            />
          </div>

          {/* Tipo e Lote */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger id="tipo" data-testid="select-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area publica">Área Pública</SelectItem>
                  <SelectItem value="praça">Praça</SelectItem>
                  <SelectItem value="canteiro">Canteiro</SelectItem>
                  <SelectItem value="rotatória">Rotatória</SelectItem>
                  <SelectItem value="jardim">Jardim</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lote">Lote</Label>
              <Select
                value={formData.lote}
                onValueChange={(value) => setFormData(prev => ({ ...prev, lote: value }))}
              >
                <SelectTrigger id="lote" data-testid="select-lote">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Lote 1</SelectItem>
                  <SelectItem value="2">Lote 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Metragem */}
          <div className="space-y-2">
            <Label htmlFor="metragem">Metragem (m²)</Label>
            <Input
              id="metragem"
              type="number"
              step="0.01"
              placeholder="Ex: 1500.50"
              value={formData.metragem_m2}
              onChange={(e) => setFormData(prev => ({ ...prev, metragem_m2: e.target.value }))}
              data-testid="input-metragem"
            />
          </div>

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
              disabled={createAreaMutation.isPending || !formData.endereco.trim()}
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
      </DialogContent>
    </Dialog>
  );
}
