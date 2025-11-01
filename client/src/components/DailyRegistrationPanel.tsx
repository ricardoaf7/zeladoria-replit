import { useState } from 'react';
import { Calendar, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface DailyRegistrationPanelProps {
  selectedAreas: number[];
  onModeChange: (isRegistrationMode: boolean) => void;
  onClearSelection: () => void;
}

export function DailyRegistrationPanel({ 
  selectedAreas, 
  onModeChange,
  onClearSelection 
}: DailyRegistrationPanelProps) {
  const [isRegistrationMode, setIsRegistrationMode] = useState(false);
  const [registrationType, setRegistrationType] = useState<'completed' | 'forecast'>('completed');
  const [registrationDate, setRegistrationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const registerMutation = useMutation({
    mutationFn: async ({ areaIds, date, type }: { areaIds: number[], date: string, type: 'completed' | 'forecast' }) => {
      const res = await apiRequest('POST', '/api/areas/register-daily', { areaIds, date, type });
      return await res.json();
    },
    onSuccess: (data: any) => {
      const typeLabel = registrationType === 'completed' ? 'registrada' : 'prevista';
      toast({
        title: `Roçagem ${typeLabel}!`,
        description: data.message || `${data.count} área(s) ${typeLabel}(s) com sucesso`,
      });
      
      // Invalidar cache para recarregar dados
      queryClient.invalidateQueries({ queryKey: ['/api/areas/rocagem'] });
      queryClient.invalidateQueries({ queryKey: ['/api/config'] });
      
      // Limpar seleção e desativar modo
      onClearSelection();
      handleToggleMode();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar",
        description: error.message || "Não foi possível registrar a roçagem",
        variant: "destructive",
      });
    },
  });

  const handleToggleMode = () => {
    const newMode = !isRegistrationMode;
    setIsRegistrationMode(newMode);
    onModeChange(newMode);
    
    if (!newMode) {
      onClearSelection();
    }
  };

  const handleRegister = () => {
    if (selectedAreas.length === 0) {
      toast({
        title: "Nenhuma área selecionada",
        description: "Selecione pelo menos uma área no mapa",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate({
      areaIds: selectedAreas,
      date: registrationDate,
      type: registrationType,
    });
  };

  return (
    <Card className="w-full" data-testid="card-daily-registration">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {registrationType === 'completed' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Clock className="h-5 w-5 text-blue-600" />
          )}
          Registro Diário de Roçagem
        </CardTitle>
        <CardDescription>
          {registrationType === 'completed' 
            ? 'Registre as áreas roçadas pela equipe'
            : 'Registre a previsão de roçagem das áreas'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isRegistrationMode ? (
          <Button 
            onClick={handleToggleMode} 
            className="w-full"
            variant="default"
            data-testid="button-activate-registration-mode"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Iniciar Registro
          </Button>
        ) : (
          <>
            <div className="space-y-3 p-3 rounded-md bg-muted/50 border">
              <div className="flex items-center justify-between">
                <Label 
                  htmlFor="registration-type" 
                  className="text-sm font-medium"
                >
                  {registrationType === 'completed' ? 'Registrar como Concluído' : 'Registrar como Previsto'}
                </Label>
                <Switch
                  id="registration-type"
                  checked={registrationType === 'forecast'}
                  onCheckedChange={(checked) => setRegistrationType(checked ? 'forecast' : 'completed')}
                  data-testid="switch-registration-type"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {registrationType === 'completed' 
                  ? 'A data deve ser passada ou hoje'
                  : 'A data pode ser futura para previsões'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration-date">
                {registrationType === 'completed' ? 'Data da Roçagem' : 'Data Prevista'}
              </Label>
              <Input
                id="registration-date"
                type="date"
                value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
                max={registrationType === 'completed' ? new Date().toISOString().split('T')[0] : undefined}
                min={registrationType === 'forecast' ? new Date().toISOString().split('T')[0] : undefined}
                data-testid="input-registration-date"
              />
            </div>

            <div 
              className="rounded-md bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 p-3"
              data-testid="container-selected-areas"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  Áreas Selecionadas
                </span>
                <span 
                  className="text-lg font-bold text-purple-600 dark:text-purple-400"
                  data-testid="text-selected-count"
                >
                  {selectedAreas.length}
                </span>
              </div>
              
              {selectedAreas.length === 0 && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  Clique nas áreas no mapa para selecioná-las
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={onClearSelection}
                variant="outline"
                className="flex-1"
                data-testid="button-clear-selection"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Limpar
              </Button>
              
              <Button
                onClick={handleRegister}
                disabled={selectedAreas.length === 0 || registerMutation.isPending}
                className="flex-1"
                data-testid="button-register-mowing"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Registrar
                  </>
                )}
              </Button>
            </div>

            <Button
              onClick={handleToggleMode}
              variant="ghost"
              size="sm"
              className="w-full"
              data-testid="button-cancel-registration-mode"
            >
              Cancelar Registro
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
