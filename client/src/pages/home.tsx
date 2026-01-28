import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { processFiles } from "@/lib/excel-processor";
import { Download, Loader2, CheckCircle, Smartphone, Instagram, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo.png";

export default function Home() {
  const [clientsFile, setClientsFile] = useState<File | null>(null);
  const [debtorsFile, setDebtorsFile] = useState<File | null>(null);
  const [extractionResult, setExtractionResult] = useState<{
    data: Uint8Array;
    detailedData?: Uint8Array;
    stats: { total: number; found: number; foundDetailed?: number; missing: number };
    fileName: string;
    detailedFileName?: string;
  } | null>(null);
  const [crossingResult, setCrossingResult] = useState<{
    data: Uint8Array;
    detailedData?: Uint8Array;
    stats: { total: number; found: number; foundDetailed?: number; missing: number };
    fileName: string;
    detailedFileName?: string;
  } | null>(null);
  const [isProcessingExtraction, setIsProcessingExtraction] = useState(false);
  const [isProcessingCrossing, setIsProcessingCrossing] = useState(false);
  const { toast } = useToast();

  const handleProcessExtraction = async () => {
    if (!debtorsFile) {
      toast({
        variant: "destructive",
        title: "Arquivo de devedores faltando",
        description: "Por favor, selecione a planilha de devedores antes de extrair.",
      });
      return;
    }

    setIsProcessingExtraction(true);
    setExtractionResult(null);

    setTimeout(async () => {
      const response = await processFiles(null, debtorsFile);
      setIsProcessingExtraction(false);

      if (response.success && response.data && response.stats && response.fileName) {
        setExtractionResult({
          data: response.data,
          detailedData: response.detailedData,
          stats: response.stats,
          fileName: response.fileName,
          detailedFileName: response.detailedFileName
        });
        toast({
          title: "Extração concluída!",
          description: `A lista foi filtrada removendo os registros com baixa ou pagamento.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro na extração",
          description: response.message || "Ocorreu um erro desconhecido.",
        });
      }
    }, 500);
  };

  const handleProcessCrossing = async () => {
    if (!clientsFile || !debtorsFile) {
      toast({
        variant: "destructive",
        title: "Arquivos faltando",
        description: "Selecione ambas as planilhas para cruzar os dados.",
      });
      return;
    }

    setIsProcessingCrossing(true);
    setCrossingResult(null);

    setTimeout(async () => {
      const response = await processFiles(clientsFile, debtorsFile);
      setIsProcessingCrossing(false);

      if (response.success && response.data && response.stats && response.fileName) {
        setCrossingResult({
          data: response.data,
          detailedData: response.detailedData,
          stats: response.stats,
          fileName: response.fileName,
          detailedFileName: response.detailedFileName
        });
        toast({
          title: "Cruzamento concluído!",
          description: `Encontrados ${response.stats.found} telefones de ${response.stats.total} devedores.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro no processamento",
          description: response.message || "Ocorreu um erro desconhecido.",
        });
      }
    }, 500);
  };

  const downloadFile = (res: any, isDetailed = false) => {
    if (!res) return;
    const data = isDetailed ? res.detailedData : res.data;
    const fileName = isDetailed ? res.detailedFileName : res.fileName;
    if (!data || !fileName) return;

    const blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Abstract Background Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-10 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-block mb-2">
            <img src={logoImg} alt="Logo" className="w-20 h-20 rounded-2xl shadow-lg shadow-purple-500/20 object-cover" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 sm:text-5xl drop-shadow-sm pb-1">
            Cruzador de Planilhas
          </h1>
          <p className="text-lg text-red-300 max-w-2xl mx-auto font-medium">
            Ferramenta profissional para automação de busca de dados. Cruze bases de clientes e devedores em segundos.
          </p>
        </div>

        <div className="space-y-10">
          {/* Section 1: Extraction (Above) */}
          <Card className="border border-amber-500/50 shadow-2xl shadow-amber-900/20 bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/5 transition-all duration-300">
            <CardHeader className="border-b border-white/5 pb-6">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-lg mb-1">
                <Wrench className="w-5 h-5" />
                <span>EXTRAIR DEVEDORES</span>
              </div>
              <CardTitle className="text-white text-xl">Filtragem e Extração</CardTitle>
              <CardDescription className="text-slate-300 text-sm">
                Esta seção apenas filtra quem já pagou e extrai os devedores e os gera em uma nova planilha. Não requer a base completa.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <FileUpload 
                label="Planilha de Devedores (Somente para Extração)" 
                description="Arquivo com os nomes para filtrar baixa/pagamento."
                onFileSelect={(file) => {
                  setDebtorsFile(file);
                  setExtractionResult(null);
                }}
              />
              {isProcessingExtraction && (
                <div className="flex flex-col items-center justify-center py-4 space-y-2 animate-in fade-in zoom-in duration-300">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                  <p className="text-white font-medium">Extraindo dados...</p>
                </div>
              )}
              {extractionResult && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/80 p-3 rounded-lg border border-white/10 text-center shadow-lg">
                      <div className="text-2xl font-bold text-white">{extractionResult.stats.total}</div>
                      <div className="text-[10px] text-slate-300 uppercase font-bold tracking-wider mt-1">Total de Linhas</div>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-lg border border-purple-500/30 text-center relative overflow-hidden shadow-lg shadow-purple-900/10">
                      <div className="absolute inset-0 bg-purple-500/5"></div>
                      <div className="text-2xl font-bold text-purple-400 relative">{extractionResult.stats.foundDetailed}</div>
                      <div className="text-[10px] text-purple-200 uppercase font-bold tracking-wider mt-1 relative">Devedores Extraídos</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => downloadFile(extractionResult, true)} 
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold h-10"
                    >
                      <Download className="mr-2 h-4 w-4" /> Baixar Relatório Extraído
                    </Button>
                  </div>
                </div>
              )}
              {!extractionResult && !isProcessingExtraction && (
                <Button 
                  size="sm" 
                  onClick={handleProcessExtraction} 
                  disabled={isProcessingExtraction || !debtorsFile}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border-0 shadow-lg shadow-amber-900/30 font-bold h-10 transition-all duration-300 hover:scale-[1.02] text-base"
                >
                  Extrair devedores
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Crossing (Below - Original Layout) */}
          <Card className="border border-white/10 shadow-2xl bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/5 transition-all duration-300">
            <CardHeader className="border-b border-white/5 pb-6">
              <div className="flex items-center gap-2 text-red-400 font-bold text-lg mb-1">
                <Smartphone className="w-5 h-5" />
                <span>CRUZAR PLANILHAS E ADICIONAR TELEFONES</span>
              </div>
              <CardTitle className="text-white text-xl">Upload de Bases</CardTitle>
              <CardDescription className="text-slate-300 text-sm">
                Selecione as duas planilhas para localizar os telefones na base completa.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-300 font-bold text-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 text-sm">1</div>
                    <span>Base Completa</span>
                  </div>
                  <FileUpload 
                    label="Planilha Geral" 
                    description="Arquivo contendo Nome e Telefone de todos os clientes."
                    onFileSelect={(file) => {
                      setClientsFile(file);
                      setCrossingResult(null);
                    }}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-300 font-bold text-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 text-sm">2</div>
                    <span>Lista de Devedores</span>
                  </div>
                  <div className="relative">
                    <FileUpload 
                      label="Planilha de Nomes" 
                      description="Arquivo com os Nomes."
                      onFileSelect={(file) => {
                        setDebtorsFile(file);
                        setCrossingResult(null);
                      }}
                    />
                    <div className="mt-3 text-sm text-amber-200 bg-amber-950/40 p-3 rounded-lg border border-amber-500/30 flex items-start gap-3">
                      <span className="mt-0.5 text-xl leading-none">⚠️</span>
                      <p className="font-medium">Obrigatório ter coluna <strong className="text-amber-100 underline decoration-amber-500/50">Telefone</strong>.</p>
                    </div>
                  </div>
                </div>
              </div>

              {isProcessingCrossing && (
                <div className="flex flex-col items-center justify-center py-4 space-y-2 animate-in fade-in zoom-in duration-300">
                  <Loader2 className="h-10 w-10 animate-spin text-red-500" />
                  <p className="text-white font-semibold">Cruzando dados...</p>
                </div>
              )}

              {crossingResult && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="bg-slate-800/80 p-3 rounded-lg border border-white/10 text-center">
                      <div className="text-xl font-bold text-white">{crossingResult.stats.total}</div>
                      <div className="text-[10px] text-slate-300 uppercase font-bold mt-1">Total</div>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-lg border border-green-500/30 text-center">
                      <div className="text-xl font-bold text-green-400">{crossingResult.stats.found}</div>
                      <div className="text-[10px] text-green-200 uppercase font-bold mt-1">Simples</div>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-lg border border-amber-500/30 text-center">
                      <div className="text-xl font-bold text-amber-400">{crossingResult.stats.foundDetailed}</div>
                      <div className="text-[10px] text-amber-200 uppercase font-bold mt-1">Detalhado</div>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-lg border border-purple-500/30 text-center">
                      <div className="text-xl font-bold text-purple-400">{crossingResult.stats.foundDetailed}</div>
                      <div className="text-[10px] text-purple-200 uppercase font-bold mt-1">Extraídos</div>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-lg border border-red-500/30 text-center">
                      <div className="text-xl font-bold text-red-400">{crossingResult.stats.missing}</div>
                      <div className="text-[10px] text-red-200 uppercase font-bold mt-1">Pendentes</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={() => downloadFile(crossingResult, false)} className="flex-1 bg-green-600 font-bold">
                      <Download className="mr-2 h-4 w-4" /> Baixar Simples
                    </Button>
                    <Button onClick={() => downloadFile(crossingResult, true)} className="flex-1 bg-amber-500 text-slate-900 font-bold">
                      <Download className="mr-2 h-4 w-4" /> Baixar Relatório Completo
                    </Button>
                  </div>
                </div>
              )}

              {!crossingResult && !isProcessingCrossing && (
                <Button 
                  size="lg" 
                  onClick={handleProcessCrossing} 
                  disabled={isProcessingCrossing || !debtorsFile || !clientsFile}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0 shadow-xl shadow-red-900/30 font-bold text-lg h-12 transition-all duration-300 hover:scale-[1.02]"
                >
                  Processar e Adicionar Telefones
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Support & Services Section */}
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {/* Support Card */}
          <Card className="bg-blue-950/30 border-blue-500/30 backdrop-blur-md shadow-lg shadow-blue-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Smartphone className="w-6 h-6 text-blue-400" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-red-400">
                  Suporte Técnico
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-blue-100 text-sm font-medium">
                Precisando de ajuda com a ferramenta? Entre em contato diretamente pelo WhatsApp.
              </p>
              <Button asChild className="w-full bg-green-600 hover:bg-green-500 text-white border-0 font-bold shadow-md">
                <a href="https://wa.me/5562991422632" target="_blank" rel="noopener noreferrer">
                  Falar no WhatsApp (62) 99142-2632
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Services Card */}
          <Card className="bg-purple-950/30 border-purple-500/30 backdrop-blur-md shadow-lg shadow-purple-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Wrench className="w-6 h-6 text-purple-400" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-red-400">
                  Outros Serviços
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-purple-100 text-sm font-medium">
                Formatação de computadores, Gestão de Tráfego Pago e Criação de Artes Profissionais.
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1 border-purple-500/40 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20 hover:text-white hover:border-purple-400/60 font-semibold">
                  <a href="https://www.instagram.com/marcos.rmo/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                    <Instagram className="w-4 h-4" />
                    @marcos.rmo
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Footer */}
        <div className="text-center pt-8 pb-4 border-t border-white/10">
          <p className="text-slate-400 text-sm mb-2 font-medium">
            Se precisa de serviços como formatar computador, gestão de tráfego pago ou artes, entre em contato comigo.
          </p>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
            © 2025 Marcos Oliveira. Todos os direitos reservados.
          </p>
        </div>

      </div>
    </div>
  );
}
