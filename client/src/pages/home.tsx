import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { ColumnReviewPanel } from "@/components/column-review";
import { Button } from "@/components/ui/button";
import { inspectFiles, processFiles, type ColumnMappings, type ColumnReview, type ColumnSelection } from "@/lib/excel-processor";
import { Download, Loader2, CheckCircle, Smartphone, Instagram, Wrench, Users, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo.png";

type ResultState = {
  data: Uint8Array;
  detailedData?: Uint8Array;
  semDevedoresData?: Uint8Array;
  semDevedoresCompletaData?: Uint8Array;
  devedoresCompletaData?: Uint8Array;
  stats: {
    total: number;
    found: number;
    foundDetailed?: number;
    missing: number;
    semDevedores?: number;
    semDevedoresCompleta?: number;
    devedoresCompletos?: number;
  };
  fileName: string;
  detailedFileName?: string;
  semDevedoresFileName?: string;
  semDevedoresCompletaFileName?: string;
  devedoresCompletaFileName?: string;
} | null;

export default function Home() {
  const [clientsFile, setClientsFile] = useState<File | null>(null);
  const [debtorsFile, setDebtorsFile] = useState<File | null>(null);
  const [extractionResult, setExtractionResult] = useState<ResultState>(null);
  const [crossingResult, setCrossingResult] = useState<ResultState>(null);
  const [columnReview, setColumnReview] = useState<ColumnReview | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMappings | null>(null);
  const [reviewMode, setReviewMode] = useState<"crossing" | "extraction" | null>(null);
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
    setColumnReview(null);
    setColumnMappings(null);
    const inspection = await inspectFiles(null, debtorsFile);
    setIsProcessingExtraction(false);

    if (inspection.success && inspection.review && inspection.mappings) {
      setColumnReview(inspection.review);
      setColumnMappings(inspection.mappings);
      setReviewMode("extraction");
    } else {
      toast({
        variant: "destructive",
        title: "Erro ao conferir as colunas",
        description: inspection.message || "Ocorreu um erro desconhecido.",
      });
    }
  };

  const handleGenerateExtraction = async () => {
    if (!debtorsFile || reviewMode !== "extraction") return;
    setIsProcessingExtraction(true);
    const response = await processFiles(null, debtorsFile, columnMappings ?? undefined);
    setIsProcessingExtraction(false);

    if (response.success && response.data && response.stats && response.fileName) {
      setExtractionResult({
        data: response.data,
        detailedData: response.detailedData,
        stats: response.stats,
        fileName: response.fileName,
        detailedFileName: response.detailedFileName
      });
      setColumnReview(null);
      setColumnMappings(null);
      setReviewMode(null);
      toast({
        title: "Extração concluída!",
        description: "A lista foi filtrada removendo os registros com baixa ou pagamento.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Erro na extração",
        description: response.message || "Ocorreu um erro desconhecido.",
      });
    }
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
    setColumnReview(null);
    setColumnMappings(null);
    const inspection = await inspectFiles(clientsFile, debtorsFile);
    setIsProcessingCrossing(false);

    if (inspection.success && inspection.review && inspection.mappings) {
      setColumnReview(inspection.review);
      setColumnMappings(inspection.mappings);
      setReviewMode("crossing");
    } else {
      toast({
        variant: "destructive",
        title: "Erro ao conferir as colunas",
        description: inspection.message || "Ocorreu um erro desconhecido.",
      });
    }
  };

  const handleGenerateCrossing = async () => {
    if (!clientsFile || !debtorsFile || reviewMode !== "crossing") return;
    setIsProcessingCrossing(true);
    const response = await processFiles(clientsFile, debtorsFile, columnMappings ?? undefined);
    setIsProcessingCrossing(false);

    if (response.success && response.data && response.stats && response.fileName) {
      setCrossingResult({
        data: response.data,
        detailedData: response.detailedData,
        semDevedoresData: response.semDevedoresData,
        semDevedoresCompletaData: response.semDevedoresCompletaData,
        devedoresCompletaData: response.devedoresCompletaData,
        stats: response.stats,
        fileName: response.fileName,
        detailedFileName: response.detailedFileName,
        semDevedoresFileName: response.semDevedoresFileName,
        semDevedoresCompletaFileName: response.semDevedoresCompletaFileName,
        devedoresCompletaFileName: response.devedoresCompletaFileName,
      });
      setColumnReview(null);
      setColumnMappings(null);
      setReviewMode(null);
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
  };

  const updateColumnMapping = (
    kind: "clients" | "debtors",
    key: string,
    selection: ColumnSelection,
  ) => {
    setColumnMappings(current => current
      ? {
          ...current,
          [kind]: {
            ...(current[kind] ?? {}),
            [key]: selection,
          },
        }
      : current);
  };

  const cancelColumnReview = () => {
    setColumnReview(null);
    setColumnMappings(null);
    setReviewMode(null);
  };
  const downloadFile = (
    res: ResultState,
    type: 'simple' | 'detailed' | 'semDevedores' | 'semDevedoresCompleta' | 'devedoresCompleta' = 'simple'
  ) => {
    if (!res) return;
    let data: Uint8Array | undefined;
    let fileName: string | undefined;

    if (type === 'semDevedores') {
      data = res.semDevedoresData;
      fileName = res.semDevedoresFileName;
    } else if (type === 'semDevedoresCompleta') {
      data = res.semDevedoresCompletaData;
      fileName = res.semDevedoresCompletaFileName;
    } else if (type === 'devedoresCompleta') {
      data = res.devedoresCompletaData;
      fileName = res.devedoresCompletaFileName;
    } else if (type === 'detailed') {
      data = res.detailedData;
      fileName = res.detailedFileName;
    } else {
      data = res.data;
      fileName = res.fileName;
    }

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
    <div className="relative min-h-screen overflow-hidden bg-[#0b1220] px-4 py-7 font-sans text-slate-100 sm:px-6 sm:py-10 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.18),_transparent_65%)]" />
      <div className="relative mx-auto max-w-6xl space-y-7 sm:space-y-9">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={logoImg}
              alt="Cruzador de Planilhas"
              className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-lg shadow-blue-950/40 sm:h-16 sm:w-16"
            />
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Organização de cobranças</p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Cruzador de Planilhas</h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Cruze sua base de clientes com a lista de débitos e gere os dois arquivos finais sem duplicidade.
              </p>
            </div>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Arquivos processados no navegador
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <main className="min-w-0 space-y-6">
          {/* Main workflow */}
          <Card className="border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <CardHeader className="border-b border-white/10 pb-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/10 text-sm font-bold text-blue-200">01</div>
                <div>
                  <CardTitle className="text-xl text-white sm:text-2xl">Cruzar planilhas</CardTitle>
                  <CardDescription className="mt-1 text-sm leading-relaxed text-slate-300">
                    Envie as duas bases. A ferramenta separa débitos em aberto de clientes pagos ou sem dívida.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-200">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-400/15 text-xs">1</span>
                    Base de clientes
                  </div>
                  <FileUpload
                    label="Planilha geral"
                    description="Inclua nomes, telefones e os demais dados dos clientes."
                    selectedFile={clientsFile}
                    onFileSelect={(file) => {
                      setClientsFile(file);
                      setCrossingResult(null);
                      setColumnReview(null);
                      setColumnMappings(null);
                      setReviewMode(null);
                    }}
                  />
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-rose-200">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-400/15 text-xs">2</span>
                    Base de débitos
                  </div>
                  <FileUpload
                    label="Planilha de devedores"
                    description="Use a lista do banco com valores, vencimentos e datas de baixa ou pagamento."
                    selectedFile={debtorsFile}
                    onFileSelect={(file) => {
                      setDebtorsFile(file);
                      setCrossingResult(null);
                      setExtractionResult(null);
                      setColumnReview(null);
                      setColumnMappings(null);
                      setReviewMode(null);
                    }}
                  />
                </div>
              </div>

              {isProcessingCrossing ? (
                <div role="status" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-blue-400/20 bg-blue-400/5 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-300" />
                  <p className="font-medium text-white">
                    {reviewMode === "crossing" ? "Gerando as planilhas..." : "Conferindo nomes, pagamentos e telefones..."}
                  </p>
                  <p className="text-xs text-slate-400">Planilhas grandes podem levar alguns segundos.</p>
                </div>
              ) : null}

              {columnReview && reviewMode === "crossing" ? (
                <ColumnReviewPanel
                  review={columnReview}
                  mappings={columnMappings ?? { debtors: {} }}
                  busy={isProcessingCrossing}
                  onChange={updateColumnMapping}
                  onConfirm={handleGenerateCrossing}
                  onCancel={cancelColumnReview}
                />
              ) : null}

              {crossingResult ? (
                <div className="space-y-5 border-t border-white/10 pt-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Processamento concluído</p>
                      <h2 className="mt-1 text-lg font-bold text-white">Seus arquivos finais</h2>
                    </div>
                    <p className="text-sm text-slate-400">Uma planilha por grupo, sem botões repetidos.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4">
                      <p className="text-xs font-medium text-rose-200">Devedores em aberto</p>
                      <p className="mt-1 text-2xl font-bold text-white" data-testid="stat-debtors">
                        {crossingResult.stats.devedoresCompletos ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-blue-400/20 bg-blue-400/[0.06] p-4">
                      <p className="text-xs font-medium text-blue-200">Sem dívida ativa</p>
                      <p className="mt-1 text-2xl font-bold text-white" data-testid="stat-no-debt">
                        {crossingResult.stats.semDevedoresCompleta ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                      <p className="text-xs font-medium text-emerald-200">Telefones localizados</p>
                      <p className="mt-1 text-2xl font-bold text-white" data-testid="stat-phones">
                        {crossingResult.stats.found}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {crossingResult.devedoresCompletaData ? (
                      <div className="flex min-h-40 flex-col justify-between gap-4 rounded-2xl border border-rose-400/25 bg-rose-400/[0.06] p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-400/15 text-rose-200">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">Devedores</h3>
                            <p className="mt-1 text-sm leading-relaxed text-slate-300">
                              Apenas débitos sem data de baixa ou pagamento, com telefones e vencimentos.
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => downloadFile(crossingResult, "devedoresCompleta")}
                          className="w-full bg-rose-600 font-semibold text-white hover:bg-rose-500"
                          data-testid="button-download-devedores-completo"
                        >
                          <Download className="mr-2 h-4 w-4" /> Baixar Devedores
                          <span className="ml-auto rounded-md bg-black/15 px-2 py-0.5 text-xs">
                            {crossingResult.stats.devedoresCompletos ?? 0}
                          </span>
                        </Button>
                      </div>
                    ) : null}

                    {crossingResult.semDevedoresCompletaData ? (
                      <div className="flex min-h-40 flex-col justify-between gap-4 rounded-2xl border border-blue-400/25 bg-blue-400/[0.06] p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-400/15 text-blue-200">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">Sem devedores</h3>
                            <p className="mt-1 text-sm leading-relaxed text-slate-300">
                              Clientes sem débito em aberto, incluindo registros com baixa ou pagamento.
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => downloadFile(crossingResult, "semDevedoresCompleta")}
                          className="w-full bg-blue-600 font-semibold text-white hover:bg-blue-500"
                          data-testid="button-download-sem-devedores-completo"
                        >
                          <Download className="mr-2 h-4 w-4" /> Baixar Sem Devedores
                          <span className="ml-auto rounded-md bg-black/15 px-2 py-0.5 text-xs">
                            {crossingResult.stats.semDevedoresCompleta ?? 0}
                          </span>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  {!crossingResult.devedoresCompletaData && !crossingResult.semDevedoresCompletaData ? (
                    <p role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">
                      Não foi possível montar os arquivos completos. Confira se as duas planilhas têm uma coluna de nome reconhecível.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!crossingResult && !isProcessingCrossing && reviewMode !== "crossing" ? (
                <Button
                  size="lg"
                  onClick={handleProcessCrossing}
                  disabled={!debtorsFile || !clientsFile}
                  className="h-12 w-full bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-950/40 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="button-process-crossing"
                >
                  Conferir colunas reconhecidas
                </Button>
              ) : null}
            </CardContent>
          </Card>
          </main>

          <aside className="space-y-4">
            <Card className="border border-white/10 bg-slate-900/70">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <CheckCircle className="h-5 w-5 text-emerald-300" />
                  Como funciona
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed text-slate-300">
                <p><strong className="text-white">Em aberto:</strong> sem data de baixa e sem data de pagamento.</p>
                <p><strong className="text-white">Sem dívida ativa:</strong> pago/baixado ou sem débito pendente.</p>
                <p><strong className="text-white">Telefones:</strong> telefone, WhatsApp e fax ficam em colunas numeradas.</p>
              </CardContent>
            </Card>

            <details className="group rounded-2xl border border-white/10 bg-slate-900/70 p-4 open:bg-slate-900/90">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-300 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-200">
                    <Wrench className="h-4 w-4" />
                  </span>
                  Extrair devedores sem cruzar
                </span>
                <span className="text-xs text-slate-400 group-open:hidden">Abrir</span>
                <span className="hidden text-xs text-slate-400 group-open:inline">Fechar</span>
              </summary>
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="mb-4 text-sm leading-relaxed text-slate-300">
                  Use esta opção quando quiser apenas remover da lista as linhas que já têm baixa ou pagamento.
                </p>
                <FileUpload
                  label="Planilha de devedores"
                  description="A base completa de clientes não é necessária."
                  selectedFile={debtorsFile}
                  onFileSelect={(file) => {
                    setDebtorsFile(file);
                    setExtractionResult(null);
                    setCrossingResult(null);
                    setColumnReview(null);
                    setColumnMappings(null);
                    setReviewMode(null);
                  }}
                />
                {isProcessingExtraction ? (
                  <div role="status" className="flex items-center justify-center gap-3 py-5 text-sm text-slate-200">
                    <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
                    {reviewMode === "extraction" ? "Gerando a planilha..." : "Conferindo as colunas..."}
                  </div>
                ) : null}
                {columnReview && reviewMode === "extraction" ? (
                  <div className="mt-4">
                    <ColumnReviewPanel
                      review={columnReview}
                      mappings={columnMappings ?? { debtors: {} }}
                      busy={isProcessingExtraction}
                      onChange={updateColumnMapping}
                      onConfirm={handleGenerateExtraction}
                      onCancel={cancelColumnReview}
                    />
                  </div>
                ) : null}
                {extractionResult ? (
                  <div className="mt-4 space-y-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                    <p className="text-sm text-slate-200">
                      {extractionResult.stats.foundDetailed ?? 0} linhas em aberto encontradas.
                    </p>
                    <Button
                      onClick={() => downloadFile(extractionResult, "detailed")}
                      className="w-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
                      data-testid="button-download-extraction"
                    >
                      <Download className="mr-2 h-4 w-4" /> Baixar lista filtrada
                    </Button>
                  </div>
                ) : null}
                {!extractionResult && !isProcessingExtraction && reviewMode !== "extraction" ? (
                  <Button
                    onClick={handleProcessExtraction}
                    disabled={!debtorsFile}
                    className="mt-4 w-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                    data-testid="button-extract-debtors"
                  >
                    Conferir colunas antes de filtrar
                  </Button>
                ) : null}
              </div>
            </details>

            <Card className="border border-white/10 bg-slate-900/70">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <Smartphone className="h-5 w-5 text-blue-300" />
                  Precisa de ajuda?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed text-slate-300">
                  Fale com o suporte pelo WhatsApp se precisar de ajuda para preparar suas planilhas.
                </p>
                <Button asChild className="w-full bg-emerald-600 font-semibold text-white hover:bg-emerald-500">
                  <a href="https://wa.me/5562991422632" target="_blank" rel="noopener noreferrer">
                    Falar no WhatsApp
                  </a>
                </Button>
                <a
                  href="https://www.instagram.com/marcos.rmo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  <Instagram className="h-4 w-4" />
                  @marcos.rmo
                </a>
              </CardContent>
            </Card>
          </aside>
        </div>

        <footer className="border-t border-white/10 pt-5 text-center text-xs text-slate-500">
          © 2025 Marcos Oliveira. Todos os direitos reservados.
        </footer>
        </div>
      </div>
  );
}
