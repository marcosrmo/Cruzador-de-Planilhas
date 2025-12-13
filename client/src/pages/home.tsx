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
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 sm:text-5xl drop-shadow-sm pb-1">
            Cruzador de Planilhas
          </h1>
          <p className="text-lg text-red-300 max-w-2xl mx-auto font-medium">
            Ferramenta profissional para automação de busca de dados. Cruze bases de clientes e devedores em segundos.
          </p>
        </div>

        {/* Main Card */}
        <Card className="border border-white/10 shadow-2xl bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/5">
          <CardHeader className="border-b border-white/5 pb-6">
            <CardTitle className="text-white text-2xl">Upload de Arquivos</CardTitle>
            <CardDescription className="text-slate-300 text-base">
              Selecione as planilhas para iniciar o processamento inteligente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-300 font-bold text-lg">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 text-sm">1</div>
                  <span>Base Completa</span>
                </div>
                <FileUpload 
                  label="Planilha Geral" 
                  description="Arquivo contendo Nome e Telefone de todos os clientes."
                  onFileSelect={setClientsFile}
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
                    description="Arquivo com os Nomes. É OBRIGATÓRIO ter uma coluna 'Telefone'."
                    onFileSelect={setDebtorsFile}
                  />
                  <div className="mt-3 text-sm text-amber-200 bg-amber-950/40 p-3 rounded-lg border border-amber-500/30 flex items-start gap-3">
                    <span className="mt-0.5 text-xl leading-none">⚠️</span>
                    <p className="font-medium">Atenção: Crie uma coluna chamada <strong className="text-amber-100 underline decoration-amber-500/50">Telefone</strong> nesta planilha, mesmo que não tenha números nela.</p>
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
                <p className="text-white font-semibold text-lg">Processando dados e cruzando informações...</p>
              </div>
            )}

            {/* Results Area */}
            {result && !isProcessing && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-500/20 rounded-full border border-green-500/30">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-green-300">Processamento Concluído!</h3>
                    <p className="text-green-100 text-sm font-medium">
                      O arquivo final foi gerado e está pronto para download.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="bg-slate-800/80 p-4 rounded-lg border border-white/10 text-center shadow-lg">
                    <div className="text-3xl font-bold text-white">{result.stats.total}</div>
                    <div className="text-xs text-slate-300 uppercase font-bold tracking-wider mt-1">Total de Linhas</div>
                  </div>
                  <div className="bg-slate-800/80 p-4 rounded-lg border border-green-500/30 text-center relative overflow-hidden shadow-lg shadow-green-900/10">
                    <div className="absolute inset-0 bg-green-500/5"></div>
                    <div className="text-3xl font-bold text-green-400 relative">{result.stats.found}</div>
                    <div className="text-xs text-green-200 uppercase font-bold tracking-wider mt-1 relative">Encontrados</div>
                  </div>
                  <div className="bg-slate-800/80 p-4 rounded-lg border border-red-500/30 text-center relative overflow-hidden shadow-lg shadow-red-900/10">
                    <div className="absolute inset-0 bg-red-500/5"></div>
                    <div className="text-3xl font-bold text-red-400 relative">{result.stats.missing}</div>
                    <div className="text-xs text-red-200 uppercase font-bold tracking-wider mt-1 relative">Pendentes</div>
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
                className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0 shadow-xl shadow-red-900/30 font-bold text-lg h-12 transition-all duration-300 hover:scale-[1.02]"
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
                  className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10 h-12 font-medium"
                >
                  Reiniciar
                </Button>
                <Button 
                  size="lg" 
                  onClick={downloadFile} 
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0 shadow-xl shadow-green-900/30 h-12 font-bold text-lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Baixar Resultado
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>

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
