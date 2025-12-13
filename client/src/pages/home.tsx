import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { processFiles } from "@/lib/excel-processor";
import { Download, Loader2, CheckCircle, Smartphone, Instagram, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [clientsFile, setClientsFile] = useState<File | null>(null);
  const [debtorsFile, setDebtorsFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    data: Uint8Array;
    stats: { total: number; found: number; missing: number };
    fileName: string;
  } | null>(null);
  const { toast } = useToast();

  const handleProcess = async () => {
    if (!clientsFile || !debtorsFile) {
      toast({
        variant: "destructive",
        title: "Arquivos faltando",
        description: "Por favor, selecione ambas as planilhas antes de processar.",
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    // Small delay to allow UI to update
    setTimeout(async () => {
      const response = await processFiles(clientsFile, debtorsFile);

      setIsProcessing(false);

      if (response.success && response.data && response.stats && response.fileName) {
        setResult({
          data: response.data,
          stats: response.stats,
          fileName: response.fileName
        });
        toast({
          title: "Processamento concluído!",
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

  const downloadFile = () => {
    if (!result) return;
    
    const blob = new Blob([result.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-transparent py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Abstract Background Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-10 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-block p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mb-2 shadow-lg shadow-purple-500/20">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl drop-shadow-sm">
            Cruzador de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-red-400">Planilhas</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Ferramenta profissional para automação de busca de dados. Cruze bases de clientes e devedores em segundos.
          </p>
        </div>

        {/* Main Card */}
        <Card className="border border-white/10 shadow-2xl bg-slate-900/60 backdrop-blur-xl ring-1 ring-white/5">
          <CardHeader className="border-b border-white/5 pb-6">
            <CardTitle className="text-white">Upload de Arquivos</CardTitle>
            <CardDescription className="text-slate-400">
              Selecione as planilhas para iniciar o processamento inteligente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-400 font-medium">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs">1</div>
                  <span>Base Completa</span>
                </div>
                <FileUpload 
                  label="Planilha Geral" 
                  description="Arquivo contendo Nome e Telefone de todos os clientes."
                  onFileSelect={setClientsFile}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-400 font-medium">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 text-xs">2</div>
                  <span>Lista de Devedores</span>
                </div>
                <div className="relative">
                  <FileUpload 
                    label="Planilha de Nomes" 
                    description="Arquivo com os Nomes. É OBRIGATÓRIO ter uma coluna 'Telefone', mesmo que vazia."
                    onFileSelect={setDebtorsFile}
                  />
                  <div className="mt-2 text-xs text-amber-400/80 bg-amber-950/30 p-2 rounded border border-amber-900/50 flex items-start gap-2">
                    <span className="mt-0.5 text-lg leading-none">⚠️</span>
                    <p>Atenção: Crie uma coluna chamada <strong>Telefone</strong> nesta planilha, mesmo que não tenha números nela.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Processing State */}
            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                  <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                </div>
                <p className="text-slate-300 font-medium">Processando dados e cruzando informações...</p>
              </div>
            )}

            {/* Results Area */}
            {result && !isProcessing && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-500/10 rounded-full border border-green-500/20">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-green-400">Processamento Concluído!</h3>
                    <p className="text-green-200/70 text-sm">
                      O arquivo final foi gerado e está pronto para download.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5 text-center">
                    <div className="text-2xl font-bold text-white">{result.stats.total}</div>
                    <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-medium tracking-wide mt-1">Total de Linhas</div>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-green-500/20 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-green-500/5"></div>
                    <div className="text-2xl font-bold text-green-400 relative">{result.stats.found}</div>
                    <div className="text-[10px] sm:text-xs text-green-200/60 uppercase font-medium tracking-wide mt-1 relative">Encontrados</div>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-red-500/20 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-red-500/5"></div>
                    <div className="text-2xl font-bold text-red-400 relative">{result.stats.missing}</div>
                    <div className="text-[10px] sm:text-xs text-red-200/60 uppercase font-medium tracking-wide mt-1 relative">Pendentes</div>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
          <CardFooter className="flex justify-end pt-2 pb-6 border-t border-white/5 mt-6">
            {!result ? (
              <Button 
                size="lg" 
                onClick={handleProcess} 
                disabled={isProcessing || !clientsFile || !debtorsFile}
                className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0 shadow-lg shadow-red-900/20 font-semibold transition-all duration-300 hover:scale-[1.02]"
              >
                {isProcessing ? (
                  <>Processando...</>
                ) : (
                  <>Processar Planilhas</>
                )}
              </Button>
            ) : (
              <div className="flex w-full gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setResult(null)}
                  className="flex-1 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  Reiniciar
                </Button>
                <Button 
                  size="lg" 
                  onClick={downloadFile} 
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0 shadow-lg shadow-green-900/20"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Resultado
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Support & Services Section */}
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {/* Support Card */}
          <Card className="bg-blue-950/20 border-blue-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-blue-100 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                Suporte Técnico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-blue-200/70 text-sm">
                Precisando de ajuda com a ferramenta? Entre em contato diretamente pelo WhatsApp.
              </p>
              <Button asChild className="w-full bg-green-600 hover:bg-green-500 text-white border-0">
                <a href="https://wa.me/5562991422632" target="_blank" rel="noopener noreferrer">
                  Falar no WhatsApp (62) 99142-2632
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Services Card */}
          <Card className="bg-purple-950/20 border-purple-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-purple-100 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-purple-400" />
                Outros Serviços
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-purple-200/70 text-sm">
                Formatação de computadores, Gestão de Tráfego Pago e Criação de Artes Profissionais.
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1 border-purple-500/30 text-purple-200 hover:bg-purple-500/10 hover:text-white hover:border-purple-400/50">
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
        <div className="text-center pt-8 pb-4 border-t border-white/5">
          <p className="text-slate-500 text-sm mb-2">
            Se precisa de serviços como formatar computador, gestão de tráfego pago ou artes, entre em contato comigo.
          </p>
          <p className="text-slate-600 text-xs font-medium">
            © 2025 Marcos Oliveira. Todos os direitos reservados.
          </p>
        </div>

      </div>
    </div>
  );
}
