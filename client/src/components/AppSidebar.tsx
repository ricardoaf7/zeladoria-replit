import { 
  MapPin, 
  Layers, 
  Leaf, 
  Flower2, 
  TreeDeciduous, 
  Waves, 
  Paintbrush, 
  Scissors, 
  Droplets,
  Trash2,
  Recycle,
  Sparkles,
  Wind,
  Package
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AreaInfoCard } from "./AreaInfoCard";
import { Separator } from "@/components/ui/separator";
import type { ServiceArea } from "@shared/schema";

interface AppSidebarProps {
  selectedService?: string;
  onServiceSelect?: (service: string) => void;
  selectedArea?: ServiceArea | null;
  onAreaClose?: () => void;
  onAreaUpdate?: (area: ServiceArea) => void;
}

export function AppSidebar({
  selectedService,
  onServiceSelect,
  selectedArea,
  onAreaClose,
  onAreaUpdate,
}: AppSidebarProps) {
  const handleServiceClick = (service: string) => {
    if (onServiceSelect) {
      onServiceSelect(service);
    }
  };

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80">
            <MapPin className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">CMTU Dashboard</h1>
            <p className="text-xs text-muted-foreground">Operações em Tempo Real</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4">
        {selectedArea && onAreaClose ? (
          <div className="mb-4">
            <AreaInfoCard 
              area={selectedArea} 
              onClose={onAreaClose}
              onUpdate={onAreaUpdate}
            />
            <Separator className="my-4" />
          </div>
        ) : null}
        
        <div className="mb-4">
          <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span>Serviços</span>
          </div>

          <Accordion type="single" collapsible defaultValue="limpeza" className="space-y-2">
            <AccordionItem value="limpeza" className="border-0">
              <AccordionTrigger 
                className="rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 px-4 py-3 hover:no-underline data-[state=open]:bg-emerald-600/30 border border-emerald-600/40"
                data-testid="accordion-limpeza-urbana"
              >
                <div className="flex items-center gap-3">
                  <Leaf className="h-5 w-5 text-emerald-400" />
                  <span className="font-semibold text-sm text-foreground">LIMPEZA URBANA</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-2 pt-2 px-2">
                <div className="space-y-1">
                  <button
                    onClick={() => handleServiceClick('rocagem')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors hover-elevate active-elevate-2 ${
                      selectedService === 'rocagem' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="service-rocagem"
                  >
                    <Scissors className="h-4 w-4 text-emerald-400" />
                    <span>Roçagem Áreas Públicas</span>
                  </button>

                  <button
                    onClick={() => handleServiceClick('jardins')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors hover-elevate active-elevate-2 ${
                      selectedService === 'jardins' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="service-jardins"
                  >
                    <Flower2 className="h-4 w-4 text-emerald-400" />
                    <span>Jardins</span>
                  </button>

                  <button
                    onClick={() => handleServiceClick('boa-praca')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors hover-elevate active-elevate-2 ${
                      selectedService === 'boa-praca' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="service-boa-praca"
                  >
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    <span>Boa Praça</span>
                  </button>

                  <button
                    onClick={() => handleServiceClick('manutencao-lagos')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors hover-elevate active-elevate-2 ${
                      selectedService === 'manutencao-lagos' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="service-manutencao-lagos"
                  >
                    <Waves className="h-4 w-4 text-emerald-400" />
                    <span>Manutenção Lagos</span>
                  </button>

                  <button
                    onClick={() => handleServiceClick('varricao')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors hover-elevate active-elevate-2 ${
                      selectedService === 'varricao' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="service-varricao"
                  >
                    <Paintbrush className="h-4 w-4 text-emerald-400" />
                    <span>Varrição</span>
                  </button>

                  <button
                    onClick={() => handleServiceClick('podas')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors hover-elevate active-elevate-2 ${
                      selectedService === 'podas' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="service-podas"
                  >
                    <TreeDeciduous className="h-4 w-4 text-emerald-400" />
                    <span>Podas</span>
                  </button>

                  <button
                    onClick={() => handleServiceClick('chafariz')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors hover-elevate active-elevate-2 ${
                      selectedService === 'chafariz' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="service-chafariz"
                  >
                    <Droplets className="h-4 w-4 text-emerald-400" />
                    <span>Chafariz</span>
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="residuos" className="border-0">
              <AccordionTrigger 
                className="rounded-lg bg-blue-600/20 hover:bg-blue-600/30 px-4 py-3 hover:no-underline data-[state=open]:bg-blue-600/30 border border-blue-600/40"
                data-testid="accordion-residuos"
              >
                <div className="flex items-center gap-3">
                  <Recycle className="h-5 w-5 text-blue-400" />
                  <span className="font-semibold text-sm text-foreground">RESÍDUOS</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-2 pt-2 px-2">
                <div className="space-y-1">
                  <button
                    onClick={() => handleServiceClick('coleta-organicos')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors hover-elevate active-elevate-2 ${
                      selectedService === 'coleta-organicos' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="service-coleta-organicos"
                  >
                    <Trash2 className="h-4 w-4 text-blue-400" />
                    <span>Coleta Orgânicos e Rejeitos</span>
                  </button>

                  <button
                    onClick={() => handleServiceClick('coleta-reciclaveis')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors hover-elevate active-elevate-2 ${
                      selectedService === 'coleta-reciclaveis' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="service-coleta-reciclaveis"
                  >
                    <Recycle className="h-4 w-4 text-blue-400" />
                    <span>Coleta Recicláveis</span>
                  </button>

                  <button
                    onClick={() => handleServiceClick('coleta-especiais')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors hover-elevate active-elevate-2 ${
                      selectedService === 'coleta-especiais' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="service-coleta-especiais"
                  >
                    <Sparkles className="h-4 w-4 text-blue-400" />
                    <span>Coleta e Limpeza Especiais</span>
                  </button>

                  <button
                    onClick={() => handleServiceClick('limpeza-bocas')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors hover-elevate active-elevate-2 ${
                      selectedService === 'limpeza-bocas' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="service-limpeza-bocas"
                  >
                    <Wind className="h-4 w-4 text-blue-400" />
                    <span>Limpeza de Bocas de Lobo</span>
                  </button>

                  <button
                    onClick={() => handleServiceClick('pevs')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors hover-elevate active-elevate-2 ${
                      selectedService === 'pevs' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="service-pevs"
                  >
                    <Package className="h-4 w-4 text-blue-400" />
                    <span>PEV's</span>
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
