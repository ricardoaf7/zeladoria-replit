import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, Database, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function AdminImport() {
  const [password, setPassword] = useState("");
  const [clearPassword, setClearPassword] = useState("");

  const importMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/admin/import-data", { password });
      return await res.json();
    },
  });

  const clearMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/admin/clear-simulation", { password });
      return await res.json();
    },
  });

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    importMutation.mutate(password);
  };

  const handleClear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearPassword) return;
    clearMutation.mutate(clearPassword);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Importação de Dados</CardTitle>
          </div>
          <CardDescription>
            Importe as 1125 áreas de roçagem para o banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!importMutation.isSuccess ? (
            <form onSubmit={handleImport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha de Administrador</Label>
                <Input
                  id="password"
                  data-testid="input-admin-password"
                  type="password"
                  placeholder="Digite a senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={importMutation.isPending}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Senha padrão: <code className="font-mono bg-muted px-1 py-0.5 rounded">cmtu2025</code>
                </p>
              </div>

              {importMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription data-testid="text-error-message">
                    {(importMutation.error as any)?.message || "Erro ao importar dados. Verifique a senha."}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                data-testid="button-import"
                className="w-full"
                disabled={!password || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando 1125 áreas...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Importar 1125 Áreas
                  </>
                )}
              </Button>

              <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                <p>📄 O arquivo CSV já está incluído no projeto</p>
                <p>⚠️ Esta ação substitui todos os dados atuais</p>
              </div>
            </form>
          ) : (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription data-testid="text-success-message" className="text-green-800 dark:text-green-200">
                <div className="space-y-2">
                  <p className="font-semibold">
                    {(importMutation.data as any)?.message || "Importação concluída!"}
                  </p>
                  <p className="text-sm">
                    ✅ {(importMutation.data as any)?.inserted || 0} áreas importadas
                  </p>
                  {(importMutation.data as any)?.skipped > 0 && (
                    <p className="text-sm">
                      ⚠️ {(importMutation.data as any)?.skipped} linhas ignoradas
                    </p>
                  )}
                  <p className="text-sm mt-4">
                    Agora você pode acessar o dashboard e ver os 1125 pontos verdes no mapa!
                  </p>
                  <Button
                    data-testid="button-go-dashboard"
                    onClick={() => window.location.href = "/"}
                    className="w-full mt-2"
                  >
                    Ir para o Dashboard
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Separator className="my-6" />

          <div className="space-y-3">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-orange-600" />
                Limpar Dados Simulados
              </h3>
              <p className="text-xs text-muted-foreground">
                Remove os dados de histórico simulados usados para apresentação
              </p>
            </div>

            {!clearMutation.isSuccess ? (
              <form onSubmit={handleClear} className="space-y-3">
                <Input
                  data-testid="input-clear-password"
                  type="password"
                  placeholder="Senha de administrador"
                  value={clearPassword}
                  onChange={(e) => setClearPassword(e.target.value)}
                  disabled={clearMutation.isPending}
                  className="text-sm"
                />

                {clearMutation.isError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {(clearMutation.error as any)?.message || "Erro ao limpar dados. Verifique a senha."}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  data-testid="button-clear-simulation"
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  disabled={!clearPassword || clearMutation.isPending}
                >
                  {clearMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Limpando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Limpar Dados Simulados
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950 py-2">
                <CheckCircle2 className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 dark:text-orange-200 text-sm">
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {(clearMutation.data as any)?.message || "Dados limpos!"}
                    </p>
                    <p className="text-xs">
                      ✅ {(clearMutation.data as any)?.cleared || 0} áreas resetadas
                    </p>
                    <Button
                      data-testid="button-reload"
                      onClick={() => window.location.reload()}
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                    >
                      Recarregar Página
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
