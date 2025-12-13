import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { processFiles } from "@/lib/excel-processor";
import { Download, Loader2, FileCheck, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Cruzador de Planilhas
          </h1>
          <p className="text-lg text-gray-600">
            Automatize a busca de telefones cruzando sua base de clientes com a lista de devedores.
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm ring-1 ring-black/5">
          <CardHeader>
            <CardTitle>Upload de Arquivos</CardTitle>
            <CardDescription>
              Selecione as duas planilhas Excel (.xlsx) para iniciar o cruzamento de dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg w-fit">
                  <span className="text-blue-600 font-semibold text-sm">Passo 1</span>
                </div>
                <FileUpload 
                  label="Planilha Geral (Com Telefones)" 
                  description="Arquivo contendo Nome e Telefone de todos os clientes."
                  onFileSelect={setClientsFile}
                />
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-indigo-50 rounded-lg w-fit">
                  <span className="text-indigo-600 font-semibold text-sm">Passo 2</span>
                </div>
                <FileUpload 
                  label="Planilha de Devedores (Sem Telefones)" 
                  description="Arquivo contendo apenas os Nomes dos devedores."
                  onFileSelect={setDebtorsFile}
                />
              </div>
            </div>

            {/* Processing State */}
            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-gray-500 font-medium">Processando dados e cruzando informações...</p>
              </div>
            )}

            {/* Results Area */}
            {result && !isProcessing && (
              <div className="rounded-xl border bg-green-50/50 border-green-100 p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-green-900">Processamento Concluído com Sucesso!</h3>
                    <p className="text-green-700 text-sm">
                      O arquivo final foi gerado e está pronto para download.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm text-center">
                    <div className="text-2xl font-bold text-gray-900">{result.stats.total}</div>
                    <div className="text-xs text-gray-500 uppercase font-medium tracking-wide">Total de Linhas</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm text-center">
                    <div className="text-2xl font-bold text-green-600">{result.stats.found}</div>
                    <div className="text-xs text-gray-500 uppercase font-medium tracking-wide">Telefones Encontrados</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm text-center">
                    <div className="text-2xl font-bold text-orange-500">{result.stats.missing}</div>
                    <div className="text-xs text-gray-500 uppercase font-medium tracking-wide">Não Encontrados</div>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
          <CardFooter className="flex justify-end pt-2 pb-6">
            {!result ? (
              <Button 
                size="lg" 
                onClick={handleProcess} 
                disabled={isProcessing || !clientsFile || !debtorsFile}
                className="w-full sm:w-auto shadow-lg shadow-primary/20"
              >
                {isProcessing ? (
                  <>Processing...</>
                ) : (
                  <>Processar Planilhas</>
                )}
              </Button>
            ) : (
              <div className="flex w-full gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setResult(null)}
                  className="flex-1"
                >
                  Reiniciar
                </Button>
                <Button 
                  size="lg" 
                  onClick={downloadFile} 
                  className="flex-1 shadow-lg shadow-green-500/20 bg-green-600 hover:bg-green-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Resultado
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Instructions */}
        <div className="grid sm:grid-cols-3 gap-4 text-center text-sm text-gray-500">
          <div className="p-4 rounded-lg bg-white border border-gray-100 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-1">1. Segurança</h4>
            <p>Seus dados são processados localmente no seu navegador. Nada é enviado para servidores externos.</p>
          </div>
          <div className="p-4 rounded-lg bg-white border border-gray-100 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-1">2. Formato</h4>
            <p>Certifique-se que seus arquivos possuem colunas "Nome" e "Telefone" na primeira linha.</p>
          </div>
          <div className="p-4 rounded-lg bg-white border border-gray-100 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-1">3. Inteligente</h4>
            <p>O sistema corrige automaticamente diferenças de acentos e maiúsculas/minúsculas.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
