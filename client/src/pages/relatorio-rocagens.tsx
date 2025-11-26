import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Calendar, Filter } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { ServiceArea } from "@shared/schema";
import { formatDateBR } from "@/lib/utils";

export default function RelatorioRocagensPage() {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedLote, setSelectedLote] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<{ dateFrom: string; dateTo: string; lote: string }>({
    dateFrom: "",
    dateTo: "",
    lote: "",
  });

  const { data: areas = [] } = useQuery<ServiceArea[]>({
    queryKey: ["/api/areas/light"],
  });

  // Filtrar áreas roçadas no período
  const rocagensFiltered = areas
    .filter(a => a.servico === "rocagem" || !a.servico) // Apenas roçagem
    .filter(a => a.ultimaRocagem) // Apenas áreas que já foram roçadas
    .filter(a => {
      if (!appliedFilters.dateFrom && !appliedFilters.dateTo) return true;
      const dataRocagem = new Date(a.ultimaRocagem!);
      if (appliedFilters.dateFrom) {
        const from = new Date(appliedFilters.dateFrom + "T00:00:00");
        if (dataRocagem < from) return false;
      }
      if (appliedFilters.dateTo) {
        const to = new Date(appliedFilters.dateTo + "T23:59:59");
        if (dataRocagem > to) return false;
      }
      return true;
    })
    .filter(a => {
      if (!appliedFilters.lote || appliedFilters.lote === "todos") return true;
      return a.lote === parseInt(appliedFilters.lote);
    })
    .sort((a, b) => {
      const dateA = new Date(a.ultimaRocagem || 0);
      const dateB = new Date(b.ultimaRocagem || 0);
      return dateB.getTime() - dateA.getTime();
    });

  // Manipulador para confirmar filtros
  const handleConfirmFilters = () => {
    setAppliedFilters({
      dateFrom,
      dateTo,
      lote: selectedLote,
    });
  };

  // Agrupar por data
  const rocagensPorData = rocagensFiltered.reduce((acc, area) => {
    const data = area.ultimaRocagem ? new Date(area.ultimaRocagem).toLocaleDateString("pt-BR") : "Sem data";
    if (!acc[data]) acc[data] = [];
    acc[data].push(area);
    return acc;
  }, {} as Record<string, ServiceArea[]>);

  // Exportar para PDF
  const handleExportPDF = async () => {
    if (rocagensFiltered.length === 0) {
      alert("Nenhuma roçagem para exportar no período selecionado");
      return;
    }

    setIsExporting(true);
    try {
      // Criar elemento temporário para capturar HTML
      const element = document.getElementById("relatorio-content");
      if (!element) {
        alert("Erro ao encontrar conteúdo do relatório");
        return;
      }

      // Capturar como canvas (vetorial via jsPDF)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Criar PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Adicionar imagem ao PDF (alta qualidade)
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297; // A4 height

      // Adicionar páginas se necessário
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      // Download com período no nome
      let fileName = "Relatorio_Rocagens";
      if (appliedFilters.dateFrom) {
        const fromDate = new Date(appliedFilters.dateFrom + "T00:00:00");
        fileName += `_${fromDate.toLocaleDateString("pt-BR").replace(/\//g, "-")}`;
      }
      if (appliedFilters.dateTo) {
        const toDate = new Date(appliedFilters.dateTo + "T00:00:00");
        fileName += `_a_${toDate.toLocaleDateString("pt-BR").replace(/\//g, "-")}`;
      }
      if (appliedFilters.lote) {
        fileName += `_Lote${appliedFilters.lote}`;
      }
      fileName += ".pdf";
      pdf.save(fileName);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      alert("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Relatório de Roçagens</h1>
          <p className="text-muted-foreground">Consulte todas as áreas roçadas em um período específico</p>
        </div>

        {/* Filtros */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filtrar por Período e Lote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground">Data Inicial</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-2"
                  data-testid="input-date-from"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground">Data Final</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-2"
                  data-testid="input-date-to"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground">Lote</label>
                <Select value={selectedLote} onValueChange={setSelectedLote}>
                  <SelectTrigger className="mt-2" data-testid="select-lote">
                    <SelectValue placeholder="Todos os lotes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os lotes</SelectItem>
                    <SelectItem value="1">Lote 1</SelectItem>
                    <SelectItem value="2">Lote 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleConfirmFilters}
                  variant="outline"
                  className="gap-2"
                  data-testid="button-confirm-filters"
                >
                  <Filter className="h-4 w-4" />
                  Confirmar
                </Button>
                <Button
                  onClick={handleExportPDF}
                  disabled={rocagensFiltered.length === 0 || isExporting}
                  className="gap-2"
                  data-testid="button-export-pdf"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? "Exportando..." : "Exportar PDF"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Roçagens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rocagensFiltered.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Áreas Únicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Set(rocagensFiltered.map(a => a.id)).size}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Metragem Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rocagensFiltered.reduce((sum, a) => sum + (a.metragem_m2 || 0), 0).toLocaleString()} m²</div>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo do Relatório (para PDF) */}
        <div
          id="relatorio-content"
          className="bg-white text-black p-8 rounded-lg mb-8"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Relatório de Roçagens - Capina e Roçagem</h2>
            <p className="text-sm text-gray-600">
              Período: {appliedFilters.dateFrom ? new Date(appliedFilters.dateFrom).toLocaleDateString("pt-BR") : "Desde o início"} até{" "}
              {appliedFilters.dateTo ? new Date(appliedFilters.dateTo).toLocaleDateString("pt-BR") : "Até hoje"}
            </p>
            {appliedFilters.lote && (
              <p className="text-sm text-gray-600">
                Lote: {appliedFilters.lote}
              </p>
            )}
            <p className="text-sm text-gray-600 mt-1">
              Data do relatório: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}
            </p>
          </div>

          {Object.entries(rocagensPorData).length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma roçagem encontrada no período selecionado</p>
            </div>
          ) : (
            Object.entries(rocagensPorData).map(([data, areas]) => (
              <div key={data} className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-gray-300">
                  📅 {data} ({areas.length} áreas)
                </h3>
                <table className="w-full text-sm border-collapse mb-6">
                  <thead>
                    <tr className="bg-gray-200 text-gray-800">
                      <th className="border border-gray-300 p-3 text-left font-semibold">ID</th>
                      <th className="border border-gray-300 p-3 text-left font-semibold">Endereço</th>
                      <th className="border border-gray-300 p-3 text-left font-semibold">Bairro</th>
                      <th className="border border-gray-300 p-3 text-right font-semibold">Metragem (m²)</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold">Lote</th>
                      <th className="border border-gray-300 p-3 text-left font-semibold">Data Roçagem</th>
                      <th className="border border-gray-300 p-3 text-left font-semibold">Registrado Por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areas.map((area, idx) => (
                      <tr key={area.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-300 p-3">{area.id}</td>
                        <td className="border border-gray-300 p-3">{area.endereco}</td>
                        <td className="border border-gray-300 p-3">{area.bairro || "-"}</td>
                        <td className="border border-gray-300 p-3 text-right">{area.metragem_m2?.toLocaleString() || "-"}</td>
                        <td className="border border-gray-300 p-3 text-center">{area.lote || "-"}</td>
                        <td className="border border-gray-300 p-3">{area.ultimaRocagem ? formatDateBR(area.ultimaRocagem) : "-"}</td>
                        <td className="border border-gray-300 p-3">{area.registradoPor || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}

          {rocagensFiltered.length > 0 && (
            <div className="mt-8 pt-4 border-t-2 border-gray-300 text-sm text-gray-600">
              <p>Total de áreas roçadas: <strong>{rocagensFiltered.length}</strong></p>
              <p>Metragem total: <strong>{rocagensFiltered.reduce((sum, a) => sum + (a.metragem_m2 || 0), 0).toLocaleString()} m²</strong></p>
            </div>
          )}
        </div>

        {/* Visualização de Lista */}
        {rocagensFiltered.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Listagem Detalhada</h2>
            <div className="space-y-2">
              {rocagensFiltered.map((area) => (
                <Card key={area.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Endereço</p>
                        <p className="font-medium">{area.endereco}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bairro</p>
                        <p className="font-medium">{area.bairro || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Data da Roçagem</p>
                        <p className="font-medium">{area.ultimaRocagem ? formatDateBR(area.ultimaRocagem) : "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Registrado Por</p>
                        <p className="font-medium">{area.registradoPor || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Metragem</p>
                        <p className="font-medium">{area.metragem_m2?.toLocaleString() || "-"} m²</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Lote</p>
                        <Badge variant="outline">{area.lote || "-"}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ID</p>
                        <p className="font-mono text-sm">{area.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={area.status === "Concluído" ? "default" : "secondary"}>{area.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
