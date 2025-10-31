import { Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import type { AppConfig } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AppSidebarProps {
  layerFilters: {
    rocagemLote1: boolean;
    rocagemLote2: boolean;
    jardins: boolean;
    teamsGiroZero: boolean;
    teamsAcabamento: boolean;
    teamsColeta: boolean;
    teamsTouceiras: boolean;
  };
  onLayerFilterChange: (filters: any) => void;
  config?: AppConfig;
}

export function AppSidebar({
  layerFilters,
  onLayerFilterChange,
  config,
}: AppSidebarProps) {
  const { toast } = useToast();
  const [lote1Rate, setLote1Rate] = useState(25000);
  const [lote2Rate, setLote2Rate] = useState(20000);

  useEffect(() => {
    if (config) {
      setLote1Rate(config.mowingProductionRate.lote1);
      setLote2Rate(config.mowingProductionRate.lote2);
    }
  }, [config]);

  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: { mowingProductionRate: { lote1: number; lote2: number } }) => {
      return await apiRequest("PATCH", "/api/config", newConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/areas/rocagem"] });
      toast({
        title: "Configuração Atualizada",
        description: "As taxas de produção foram atualizadas e o agendamento recalculado.",
      });
    },
  });

  const handleUpdateRates = () => {
    updateConfigMutation.mutate({
      mowingProductionRate: {
        lote1: lote1Rate,
        lote2: lote2Rate,
      },
    });
  };

  const toggleFilter = (key: string) => {
    onLayerFilterChange({
      ...layerFilters,
      [key]: !layerFilters[key as keyof typeof layerFilters],
    });
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-sidebar-foreground">
            CMTU-LD
          </h1>
          <p className="text-sm text-muted-foreground">Dashboard Operacional</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Filtros de Camadas</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-4 px-4">
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Roçagem
                </h3>
                <div className="space-y-2 pl-2">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="rocagemLote1"
                      checked={layerFilters.rocagemLote1}
                      onCheckedChange={() => toggleFilter("rocagemLote1")}
                      data-testid="checkbox-rocagem-lote1"
                    />
                    <Label
                      htmlFor="rocagemLote1"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Roçagem (Lote 1)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="rocagemLote2"
                      checked={layerFilters.rocagemLote2}
                      onCheckedChange={() => toggleFilter("rocagemLote2")}
                      data-testid="checkbox-rocagem-lote2"
                    />
                    <Label
                      htmlFor="rocagemLote2"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Roçagem (Lote 2)
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Outros Serviços
                </h3>
                <div className="space-y-2 pl-2">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="jardins"
                      checked={layerFilters.jardins}
                      onCheckedChange={() => toggleFilter("jardins")}
                      data-testid="checkbox-jardins"
                    />
                    <Label
                      htmlFor="jardins"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Manutenção de Jardins
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Equipes
                </h3>
                <div className="space-y-2 pl-2">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="teamsGiroZero"
                      checked={layerFilters.teamsGiroZero}
                      onCheckedChange={() => toggleFilter("teamsGiroZero")}
                      data-testid="checkbox-teams-giro-zero"
                    />
                    <Label
                      htmlFor="teamsGiroZero"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Equipes: Giro Zero
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="teamsAcabamento"
                      checked={layerFilters.teamsAcabamento}
                      onCheckedChange={() => toggleFilter("teamsAcabamento")}
                      data-testid="checkbox-teams-acabamento"
                    />
                    <Label
                      htmlFor="teamsAcabamento"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Equipes: Acabamento
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="teamsColeta"
                      checked={layerFilters.teamsColeta}
                      onCheckedChange={() => toggleFilter("teamsColeta")}
                      data-testid="checkbox-teams-coleta"
                    />
                    <Label
                      htmlFor="teamsColeta"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Equipes: Coleta
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="teamsTouceiras"
                      checked={layerFilters.teamsTouceiras}
                      onCheckedChange={() => toggleFilter("teamsTouceiras")}
                      data-testid="checkbox-teams-touceiras"
                    />
                    <Label
                      htmlFor="teamsTouceiras"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Equipes: Touceiras
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-4" />

        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Configuração de Produção</span>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-4 px-4">
              <div className="space-y-2">
                <Label htmlFor="lote1Rate" className="text-sm">
                  Produção Média Lote 1 (m²/dia)
                </Label>
                <Input
                  id="lote1Rate"
                  type="number"
                  value={lote1Rate}
                  onChange={(e) => setLote1Rate(Number(e.target.value))}
                  className="font-mono"
                  data-testid="input-lote1-rate"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lote2Rate" className="text-sm">
                  Produção Média Lote 2 (m²/dia)
                </Label>
                <Input
                  id="lote2Rate"
                  type="number"
                  value={lote2Rate}
                  onChange={(e) => setLote2Rate(Number(e.target.value))}
                  className="font-mono"
                  data-testid="input-lote2-rate"
                />
              </div>

              <Button
                onClick={handleUpdateRates}
                className="w-full"
                disabled={updateConfigMutation.isPending}
                data-testid="button-update-rates"
              >
                {updateConfigMutation.isPending ? "Atualizando..." : "Atualizar Taxas"}
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
