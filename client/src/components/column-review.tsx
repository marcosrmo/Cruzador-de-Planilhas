import { CheckCircle2, Columns3, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ColumnMappings,
  ColumnReview,
  ColumnSelection,
  SpreadsheetColumnReview,
} from "@/lib/excel-processor";

type Props = {
  review: ColumnReview;
  mappings: ColumnMappings;
  busy: boolean;
  onChange: (kind: "clients" | "debtors", key: string, selection: ColumnSelection) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

function selectedIndices(selection: ColumnSelection | undefined): number[] {
  if (selection === undefined) return [];
  return Array.isArray(selection) ? selection : selection < 0 ? [] : [selection];
}

function SheetFields({
  kind,
  sheet,
  mappings,
  onChange,
}: {
  kind: "clients" | "debtors";
  sheet: SpreadsheetColumnReview;
  mappings: ColumnMappings;
  onChange: Props["onChange"];
}) {
  const sheetMappings = mappings[kind] ?? {};

  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">
            {kind === "clients" ? "Base de clientes" : "Base de débitos"}
          </h3>
          <p className="mt-1 break-all text-xs text-slate-400">{sheet.fileName}</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
          {sheet.headers.length} colunas
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {sheet.fields.map(field => {
          const selection = sheetMappings[field.key] ?? field.selected;
          const selected = selectedIndices(selection);
          const hasSelection = selected.length > 0;
          const controlId = `column-${kind}-${field.key}`;

          return (
            <div key={field.key} className="min-w-0 rounded-lg border border-white/10 bg-slate-900/70 p-3">
              <label htmlFor={controlId} className="flex items-center justify-between gap-2 text-sm font-medium text-slate-100">
                <span>{field.label}{field.required ? " *" : ""}</span>
                {hasSelection ? (
                  <CheckCircle2 aria-label="Coluna reconhecida" className="h-4 w-4 shrink-0 text-emerald-300" />
                ) : (
                  <TriangleAlert aria-label="Coluna não reconhecida" className="h-4 w-4 shrink-0 text-amber-300" />
                )}
              </label>
              {field.multiple ? (
                <>
                  <select
                    id={controlId}
                    multiple
                    size={Math.min(4, Math.max(2, sheet.headers.length))}
                    value={selected.map(String)}
                    onChange={event => onChange(
                      kind,
                      field.key,
                      Array.from(event.currentTarget.selectedOptions, option => Number(option.value)),
                    )}
                    className="mt-2 w-full rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                    data-testid={`column-select-${kind}-${field.key}`}
                  >
                    {sheet.headers.map((header, index) => (
                      <option key={`${index}-${header}`} value={index}>
                        {index + 1}. {header}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-400">Selecione várias com Ctrl ou Cmd.</p>
                </>
              ) : (
                <select
                  id={controlId}
                  value={selected[0] ?? -1}
                  onChange={event => onChange(kind, field.key, Number(event.currentTarget.value))}
                  className="mt-2 w-full rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  data-testid={`column-select-${kind}-${field.key}`}
                >
                  <option value={-1}>Não usar esta coluna</option>
                  {sheet.headers.map((header, index) => (
                    <option key={`${index}-${header}`} value={index}>
                      {index + 1}. {header}
                    </option>
                  ))}
                </select>
              )}
              <p className={`mt-1 text-xs ${hasSelection ? "text-emerald-300" : "text-amber-200"}`}>
                {hasSelection ? "Reconhecida" : field.required ? "Obrigatória: selecione uma coluna" : "Não reconhecida"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ColumnReviewPanel({
  review,
  mappings,
  busy,
  onChange,
  onConfirm,
  onCancel,
}: Props) {
  const requiredNamesMapped = [review.clients, review.debtors]
    .filter((sheet): sheet is SpreadsheetColumnReview => Boolean(sheet))
    .every(sheet => {
      const kind = sheet === review.clients ? "clients" : "debtors";
      const nameSelection = mappings[kind]?.name;
      return selectedIndices(nameSelection ?? sheet.fields.find(field => field.key === "name")?.selected).length > 0;
    });

  return (
    <div className="space-y-4 rounded-2xl border border-blue-300/20 bg-blue-300/[0.04] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-400/10 text-blue-200">
          <Columns3 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-bold text-white">Confira as colunas reconhecidas</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            Ajuste qualquer vínculo antes de gerar os arquivos. As alterações serão usadas nas planilhas finais.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {review.clients ? (
          <SheetFields kind="clients" sheet={review.clients} mappings={mappings} onChange={onChange} />
        ) : null}
        <SheetFields kind="debtors" sheet={review.debtors} mappings={mappings} onChange={onChange} />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={busy}
          className="border-white/15 bg-transparent text-slate-200 hover:bg-white/5 hover:text-white"
        >
          Voltar
        </Button>
        <Button
          onClick={onConfirm}
          disabled={busy || !requiredNamesMapped}
          className="bg-emerald-600 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          data-testid="button-confirm-columns"
        >
          {busy ? "Gerando planilhas..." : "Confirmar colunas e gerar"}
        </Button>
      </div>
    </div>
  );
}
