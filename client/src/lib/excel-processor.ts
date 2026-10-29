import * as XLSX from 'xlsx';

// Utility to normalize text (remove accents, lowercase, trim)
export function normalizeText(text: any): string {
  if (!text) return "";

  // 1. Converte para texto e minúsculas
  let str = String(text).toLowerCase();

  // 2. Remove acentos (ex: á -> a, ç -> c)
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 3. Remove termos jurídicos comuns que atrapalham a comparação
  const stopWords = [" ltda", " s.a", " sa ", " me ", " epp ", " me"];
  stopWords.forEach(word => {
    str = str.replace(word, "");
  });

  // 4. Remove caracteres especiais (pontos, traços, parênteses)
  // Mantém apenas letras e números
  str = str.replace(/[^a-z0-9\s]/g, "");

  // 5. Remove espaços extras (ex: "Jose   Silva" -> "jose silva")
  return str.trim().replace(/\s+/g, " ");
}

// Simple Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const matrix = [];
  let i, j;

  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Find column that matches the pattern (e.g. 'nome', 'telefone')
function findSimilarColumn(columns: string[], pattern: string): string | null {
  const normalizedPattern = normalizeText(pattern);
  
  // 1. Exact match (normalized)
  const exact = columns.find(c => normalizeText(c) === normalizedPattern);
  if (exact) return exact;

  // 2. Contains match
  const contains = columns.find(c => normalizeText(c).includes(normalizedPattern));
  if (contains) return contains;

  // 3. Fuzzy match
  let bestMatch = null;
  let minDistance = Infinity;

  for (const col of columns) {
    const normCol = normalizeText(col);
    const distance = levenshtein(normCol, normalizedPattern);
    const threshold = Math.max(pattern.length * 0.4, 2); // Allow some tolerance

    if (distance <= threshold && distance < minDistance) {
      minDistance = distance;
      bestMatch = col;
    }
  }

  return bestMatch;
}


export interface ProcessResult {
  success: boolean;
  message?: string;
  data?: Uint8Array;
  detailedData?: Uint8Array; // New field for detailed report
  semDevedoresData?: Uint8Array; // New field for clients without debtors
  semDevedoresCompletaData?: Uint8Array;
  devedoresCompletaData?: Uint8Array;
  stats?: {
    total: number;
    found: number;
    foundDetailed: number; // New field for detailed report count
    missing: number;
    semDevedores?: number; // Count of clients without debtors
    semDevedoresCompleta?: number;
    devedoresCompletos?: number;
  };
  fileName?: string;
  detailedFileName?: string;
  semDevedoresFileName?: string;
  semDevedoresCompletaFileName?: string;
  devedoresCompletaFileName?: string;
}

// Utility to format date to DD/MM/YYYY
function formatDate(value: any): string {
  if (!value) return "";
  
  // If it's a number (Excel date serial), convert it
  if (typeof value === 'number') {
    const date = XLSX.utils.format_cell({ v: value, t: 'd' });
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    }
  }

  // If it's already a string, try to parse or return as is if already in DD/MM/YYYY
  const str = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return str;
}

// Column groups for "sem devedores" spreadsheet.
// Each group has a display label and multiple patterns to search in the input.
const SEM_DEVEDORES_GROUPS: { label: string; patterns: string[] }[] = [
  { label: "CNPJ/CPF",        patterns: ["cnpj/cpf", "cnpj cpf", "cnpj", "cpf"] },
  { label: "CIDADE",           patterns: ["cidade", "municipio"] },
  { label: "FONE",             patterns: ["fone", "telefone", "phone"] },
  { label: "LOGRADOURO",       patterns: ["logradouro", "endereco", "enderec", "endereço", "rua", "logr"] },
  { label: "N",                patterns: ["numero", "num", "n"] },
  { label: "BAIRRO",           patterns: ["bairro"] },
  { label: "U.F.",             patterns: ["uf", "u f", "estado"] },
  { label: "CEP",              patterns: ["cep"] },
  { label: "Dt. Últ. Compra", patterns: ["dt ult compra", "data ult compra", "data ultima compra", "data compras", "dt compras", "dt compra", "data compra", "dt ult"] },
  { label: "Descrição",        patterns: ["descricao", "descricão", "descricao", "desc", "nota", "nf"] },
  { label: "Qt. Total",        patterns: ["qt total", "quantidade total", "qtd total", "qt", "quantidade", "qtd", "vl compras", "ticket medio"] },
];

const COMPLETE_EXPORT_FIELDS: { label: string; patterns: string[] }[] = [
  { label: "Nome do Cliente", patterns: ["nome do cliente", "nome cliente", "nome pagador", "cliente", "nome"] },
  { label: "E-mail", patterns: ["e-mail", "email", "correio eletronico"] },
  { label: "CPF/CNPJ", patterns: ["cpf/cnpj", "cnpj/cpf", "cpf cnpj", "cnpj cpf", "cpf", "cnpj"] },
  { label: "Valor", patterns: ["valor", "valor parcela", "valor devido", "valor em aberto"] },
  { label: "Vencimento", patterns: ["data de vencimento", "data vencimento", "vencimento"] },
  { label: "Nº Parcela", patterns: ["numero da parcela", "numero parcela", "num parcela", "nro parcela", "n parcela", "parcela atual", "parcela"] },
  { label: "Total de Parcelas", patterns: ["total de parcelas", "total parcelas", "parcelas total", "quantidade de parcelas", "qtd parcelas"] },
  { label: "Nº Documento", patterns: ["numero do documento", "numero documento", "num documento", "nro documento", "n documento", "documento"] },
  { label: "Descrição", patterns: ["descricao", "historico", "detalhe", "observacao", "observacoes", "desc"] },
  { label: "Data da Venda", patterns: ["data da venda", "data de venda", "data venda", "data ultima venda", "dt da venda", "dt venda", "dt ult venda"] },
];

const COMPLETE_EXTRA_GROUPS = SEM_DEVEDORES_GROUPS.filter(
  group => !["CNPJ/CPF", "FONE", "Descrição"].includes(group.label)
);

function findColumnIndexByPatterns(headers: string[], patterns: string[]): number {
  // sheet_to_json can return sparse arrays when the worksheet has blank header cells.
  // Array.from fills those gaps so findIndex never calls includes on an undefined slot.
  const normalizedHeaders = Array.from(headers, header => normalizeText(header));
  const normalizedPatterns = patterns.map(pattern => normalizeText(pattern));

  for (const pattern of normalizedPatterns) {
    const exactIndex = normalizedHeaders.findIndex(header => header === pattern);
    if (exactIndex !== -1) return exactIndex;
  }

  for (const pattern of [...normalizedPatterns].sort((a, b) => b.length - a.length)) {
    if (pattern.length < 3) continue;
    const containsIndex = normalizedHeaders.findIndex(header => header.includes(pattern));
    if (containsIndex !== -1) return containsIndex;
  }

  return -1;
}

function findColumnNameByPatterns(headers: string[], patterns: string[]): string | null {
  const index = findColumnIndexByPatterns(headers, patterns);
  return index === -1 ? null : headers[index];
}

function findPhoneColumnIndices(headers: string[]): number[] {
  const phoneTerms = ["telefone", "fone", "celular", "whatsapp", "whats", "phone"];
  return headers.reduce<number[]>((indices, header, index) => {
    const normalized = normalizeText(header);
    if (phoneTerms.some(term => normalized.includes(term))) indices.push(index);
    return indices;
  }, []);
}

function findCpfCnpjColumnIndices(headers: string[]): number[] {
  return headers.reduce<number[]>((indices, header, index) => {
    const normalized = normalizeText(header);
    if (normalized.includes("cpf") || normalized.includes("cnpj")) indices.push(index);
    return indices;
  }, []);
}

function findDocumentColumnIndices(headers: string[]): number[] {
  const documentPatterns = [
    "numero do documento",
    "numero documento",
    "num documento",
    "nro documento",
    "n documento",
    "documento",
    "nosso numero",
    "seu numero",
    "numero do titulo",
    "numero titulo",
    "id documento",
  ];
  return headers.reduce<number[]>((indices, header, index) => {
    const normalized = normalizeText(header);
    const matches = documentPatterns.some(pattern => (
      normalized === pattern || (pattern !== "documento" && normalized.includes(pattern))
    ));
    if (matches) indices.push(index);
    return indices;
  }, []);
}

function hasCellValue(value: any): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function splitPhoneValues(value: any): string[] {
  if (!hasCellValue(value)) return [];
  return String(value)
    .split(/[;,\n|/]+/)
    .map(phone => phone.trim())
    .filter(Boolean);
}

function phoneDeduplicationKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 12 && digits.startsWith("55") ? digits.slice(2) : digits;
}

function uniquePhoneValues(values: any[]): string[] {
  const seen = new Set<string>();
  const phones: string[] = [];

  for (const value of values) {
    for (const phone of splitPhoneValues(value)) {
      const key = phoneDeduplicationKey(phone);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      phones.push(phone);
    }
  }

  return phones;
}

function combineUniqueDocumentValues(row: any[], indices: number[]): string {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const index of indices) {
    const value = row[index];
    if (!hasCellValue(value)) continue;
    const text = String(value).trim();
    const key = text.replace(/\D/g, "") || normalizeText(text);
    if (key && !seen.has(key)) {
      seen.add(key);
      values.push(text);
    }
  }

  return values.join(" / ");
}

function uniqueCellValues(values: any[]): any[] {
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const value of values) {
    if (!hasCellValue(value)) continue;
    const key = value instanceof Date
      ? `date:${value.getTime()}`
      : String(value).trim().toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return unique;
}

function aggregateCellValues(
  values: any[],
  formatValue: (value: any) => any = value => value,
): any {
  const formatted = uniqueCellValues(values).map(formatValue);
  if (formatted.length === 0) return "";
  if (formatted.length === 1) return formatted[0];
  return formatted.map(value => String(value)).join(" / ");
}

function aggregateColumnValues(
  rows: any[][],
  columnIndex: number,
  formatValue?: (value: any) => any,
): any {
  if (columnIndex < 0) return "";
  return aggregateCellValues(rows.map(row => row?.[columnIndex]), formatValue);
}

function aggregateColumnsAcrossRows(
  rows: any[][],
  columnIndices: number[],
): any {
  const values: any[] = [];
  for (const row of rows) {
    for (const columnIndex of columnIndices) {
      if (columnIndex >= 0) values.push(row?.[columnIndex]);
    }
  }
  return aggregateCellValues(values, value => String(value).trim());
}

function parseCurrencyAmount(value: any): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!hasCellValue(value)) return null;

  const original = String(value).trim();
  const isNegative = original.startsWith("-") || /^\(.*\)$/.test(original);
  let numeric = original.replace(/[^\d.,]/g, "");
  if (!numeric) return null;

  const lastComma = numeric.lastIndexOf(",");
  const lastDot = numeric.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    numeric = lastComma > lastDot
      ? numeric.replace(/\./g, "").replace(/,/g, ".")
      : numeric.replace(/,/g, "");
  } else if (lastComma >= 0) {
    numeric = numeric.replace(/\./g, "").replace(/,/g, ".");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(numeric)) {
    numeric = numeric.replace(/\./g, "");
  }

  const parsed = Number(numeric);
  if (!Number.isFinite(parsed)) return null;
  return isNegative ? -Math.abs(parsed) : parsed;
}

export async function processFiles(
  clientsFile: File | null, 
  debtorsFile: File
): Promise<ProcessResult> {
  let processingStage = "inicialização";
  try {
    // 0. Log file sizes for debugging
    console.log("📦 FILE SIZES:", {
      debtorsFile: `${(debtorsFile.size / 1024 / 1024).toFixed(1)}MB`,
      clientsFile: clientsFile ? `${(clientsFile.size / 1024 / 1024).toFixed(1)}MB` : "Não fornecido"
    });

    // 1. Read files
    const readExcel = async (file: File, label: string) => {
      try {
        if (!file || file.size === 0) {
          throw new Error("o arquivo está vazio");
        }

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { cellDates: true });
        if (!workbook.SheetNames.length) {
          throw new Error("nenhuma aba foi encontrada");
        }

        // Some exports include a blank cover sheet before the actual table.
        const firstSheetName = workbook.SheetNames.find(name => {
          const sheet = workbook.Sheets[name];
          return Boolean(sheet && sheet["!ref"]);
        }) ?? workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          throw new Error("a primeira aba não pôde ser aberta");
        }

        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
        if (!rows.length) {
          throw new Error("a aba selecionada não contém dados");
        }
        return rows;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Não foi possível ler a planilha ${label} "${file.name}": ${reason}`);
      }
    };

    processingStage = "leitura da planilha de devedores";
    const debtorsDataRaw = await readExcel(debtorsFile, "de devedores") as any[][];
    processingStage = "leitura da base de clientes";
    const clientsDataRaw = clientsFile ? await readExcel(clientsFile, "de clientes") as any[][] : null;

    processingStage = "identificação das colunas";
    if (debtorsDataRaw.length < 2) {
      return { success: false, message: "A planilha de devedores parece estar vazia." };
    }

    // 2. Identify columns
    const debtorsHeader = debtorsDataRaw[0] as string[];
    
    // Debug: Log found columns
    console.log("📋 DEBTORS HEADER:", debtorsHeader);
    if (clientsDataRaw) {
      const clientsHeader = clientsDataRaw[0] as string[];
      console.log("📋 CLIENTS HEADER:", clientsHeader);
    }
    
    // Try multiple patterns for each column
    const colNameDebtors = findSimilarColumn(debtorsHeader, 'nome') || 
                          findSimilarColumn(debtorsHeader, 'nome pagador');
    const colLowerDate = findColumnNameByPatterns(debtorsHeader, ['data de baixa', 'data baixa']);
    const colPaymentDate = findColumnNameByPatterns(debtorsHeader, ['data de pagamento', 'data pagamento']);
    const colValue = findSimilarColumn(debtorsHeader, 'valor');
    const colDueDate = findColumnNameByPatterns(debtorsHeader, ['data de vencimento', 'data vencimento']);

    console.log("🔍 COLUMN MAPPING:", {
      colNameDebtors,
      colLowerDate,
      colPaymentDate,
      colValue,
      colDueDate
    });

    if (!colNameDebtors) {
      return { 
        success: false, 
        message: `❌ Não foi possível encontrar a coluna de NOME na planilha de devedores.\n\nColunas encontradas: ${debtorsHeader.slice(0, 20).join(', ')}${debtorsHeader.length > 20 ? '... e mais' : ''}` 
      };
    }

    const idxNameDebtors = debtorsHeader.indexOf(colNameDebtors);
    const idxLowerDate = colLowerDate ? debtorsHeader.indexOf(colLowerDate) : -1;
    const idxPaymentDate = colPaymentDate ? debtorsHeader.indexOf(colPaymentDate) : -1;
    const idxValue = colValue ? debtorsHeader.indexOf(colValue) : -1;
    const idxDueDate = colDueDate ? debtorsHeader.indexOf(colDueDate) : -1;

    // 3. Index Base data if available
    // Map to store multiple phones per name, so we can prioritize 11-digit numbers
    const phoneMapMultiple = new Map<string, string[]>();
    const phoneMap = new Map<string, string>();
    
    // Extra info: store all extra column indices for clients
    let clientsHeader: string[] = [];
    let colNameClients: string | null = null;
    let colPhoneClients: string | null = null;
    let extraColIndices: number[] = [];
    let extraColNames: string[] = [];
    let completeClientNameIndex = -1;
    let completeClientPhoneIndices: number[] = [];
    let completeDebtorPhoneIndices: number[] = [];
    let completeClientCpfCnpjIndices: number[] = [];
    let completeDebtorCpfCnpjIndices: number[] = [];
    let completeDebtorDocumentIndices: number[] = [];
    let completeClientFieldIndices = new Map<string, number>();
    let completeDebtorFieldIndices = new Map<string, number>();
    let completeExtraFieldIndices = new Map<string, number>();
    let completeDebtorExtraFieldIndices = new Map<string, number>();
    const completeClientRecords = new Map<string, {
      name: any;
      phones: string[];
      seenPhones: Set<string>;
      values: Map<string, any>;
    }>();

    if (clientsDataRaw && clientsDataRaw.length >= 2) {
      processingStage = "identificação das colunas da base de clientes";
      clientsHeader = clientsDataRaw[0] as string[];
      colNameClients = findSimilarColumn(clientsHeader, 'nome');
      colPhoneClients = findSimilarColumn(clientsHeader, 'telefone') || 
                             findSimilarColumn(clientsHeader, 'fone') ||
                             findSimilarColumn(clientsHeader, 'phone');

      console.log("📞 CLIENTS COLUMN MAPPING:", {
        colNameClients,
        colPhoneClients
      });

      // Find extra columns for sem devedores spreadsheet using group-based matching
      for (const group of SEM_DEVEDORES_GROUPS) {
        let foundCol: string | null = null;
        for (const pattern of group.patterns) {
          foundCol = findSimilarColumn(clientsHeader, pattern);
          if (foundCol) break;
        }
        if (foundCol) {
          extraColNames.push(group.label);
          extraColIndices.push(clientsHeader.indexOf(foundCol));
        } else {
          // Column not found — include it as empty
          extraColNames.push(group.label);
          extraColIndices.push(-1);
        }
      }
      console.log("📊 EXTRA COLUMNS FOR SEM DEVEDORES:", extraColNames);

      processingStage = "mapeamento dos campos completos";
      completeClientNameIndex = findColumnIndexByPatterns(clientsHeader, COMPLETE_EXPORT_FIELDS[0].patterns);
      completeClientPhoneIndices = findPhoneColumnIndices(clientsHeader);
      completeDebtorPhoneIndices = findPhoneColumnIndices(debtorsHeader);
      completeClientCpfCnpjIndices = findCpfCnpjColumnIndices(clientsHeader);
      completeDebtorCpfCnpjIndices = findCpfCnpjColumnIndices(debtorsHeader);
      completeDebtorDocumentIndices = findDocumentColumnIndices(debtorsHeader);
      completeClientFieldIndices = new Map(
        COMPLETE_EXPORT_FIELDS.slice(1).map(field => [
          field.label,
          findColumnIndexByPatterns(clientsHeader, field.patterns),
        ])
      );
      completeDebtorFieldIndices = new Map(
        COMPLETE_EXPORT_FIELDS.slice(1).map(field => [
          field.label,
          findColumnIndexByPatterns(debtorsHeader, field.patterns),
        ])
      );
      completeExtraFieldIndices = new Map(
        COMPLETE_EXTRA_GROUPS.map(group => [
          group.label,
          findColumnIndexByPatterns(clientsHeader, group.patterns),
        ])
      );
      completeDebtorExtraFieldIndices = new Map(
        COMPLETE_EXTRA_GROUPS.map(group => [
          group.label,
          findColumnIndexByPatterns(debtorsHeader, group.patterns),
        ])
      );

      if (completeClientNameIndex !== -1) {
        processingStage = "indexação dos registros completos da base de clientes";
        for (let i = 1; i < clientsDataRaw.length; i++) {
          const row = clientsDataRaw[i];
          const name = row[completeClientNameIndex];
          if (!hasCellValue(name)) continue;

          const normalizedName = normalizeText(name);
          let record = completeClientRecords.get(normalizedName);
          if (!record) {
            record = { name, phones: [], seenPhones: new Set<string>(), values: new Map<string, any>() };
            completeClientRecords.set(normalizedName, record);
          }

          for (const phoneIndex of completeClientPhoneIndices) {
            for (const phoneValue of splitPhoneValues(row[phoneIndex])) {
              const key = phoneDeduplicationKey(phoneValue);
              if (key && !record.seenPhones.has(key)) {
                record.seenPhones.add(key);
                record.phones.push(phoneValue);
              }
            }
          }

          completeClientFieldIndices.forEach((columnIndex, label) => {
            if (columnIndex === -1 || label === "CPF/CNPJ" || record.values.has(label)) return;
            const value = row[columnIndex];
            if (hasCellValue(value)) record.values.set(label, value);
          });
          if (!record.values.has("CPF/CNPJ")) {
            const documentValue = combineUniqueDocumentValues(row, completeClientCpfCnpjIndices);
            if (documentValue) record.values.set("CPF/CNPJ", documentValue);
          }

          completeExtraFieldIndices.forEach((columnIndex, label) => {
            if (columnIndex === -1 || record.values.has(label)) return;
            const value = row[columnIndex];
            if (hasCellValue(value)) record.values.set(label, value);
          });
        }
      }

      if (colNameClients && colPhoneClients) {
        processingStage = "indexação dos telefones da base de clientes";
        const idxNameClients = clientsHeader.indexOf(colNameClients);
        const idxPhoneClients = clientsHeader.indexOf(colPhoneClients);

        // First pass: collect all phones per name
        for (let i = 1; i < clientsDataRaw.length; i++) {
          const row = clientsDataRaw[i];
          const name = row[idxNameClients];
          const phone = row[idxPhoneClients];
          if (name && phone) {
            const normName = normalizeText(name);
            const phoneStr = String(phone).trim();
            
            if (!phoneMapMultiple.has(normName)) {
              phoneMapMultiple.set(normName, []);
            }
            phoneMapMultiple.get(normName)!.push(phoneStr);
          }
        }

        // Second pass: select the best phone for each name
        // Priority: 11-digit phone (celular) > any other phone
        phoneMapMultiple.forEach((phones, normName) => {
          const uniquePhones: string[] = [];
          for (const phone of phones) {
            if (!uniquePhones.includes(phone)) uniquePhones.push(phone);
          }
          
          // Look for 11-digit phone (celular)
          const elevenDigitPhone = uniquePhones.find((phone: string) => {
            const digitsOnly = phone.replace(/\D/g, '');
            return digitsOnly.length === 11;
          });
          
          if (elevenDigitPhone) {
            phoneMap.set(normName, elevenDigitPhone);
          } else if (uniquePhones.length > 0) {
            // No 11-digit phone found, use the first available
            phoneMap.set(normName, uniquePhones[0]);
          }
        });

        console.log("✅ Phone mapping completed. Total names indexed:", phoneMap.size);
      } else {
        console.warn("⚠️ Não foi possível mapear as colunas de clientes:", { colNameClients, colPhoneClients });
      }
    }

    // 4. Process debtors
    processingStage = "cruzamento dos devedores";
    const resultData = [['Nome', 'Telefone']];
    const detailedData = [['Nome', 'Telefone', 'Valor', 'Data de Vencimento']];
    const seenPhonesSimple = new Set<string>(); // Para o relatório simples (apenas Telefone)
    const seenEntriesDetailed = new Set<string>(); // Para o relatório completo (Telefone + Data)
    let totalLinesProcessed = 0;
    let foundCount = 0;
    let foundDetailedCount = 0;
    let missingCount = 0;

    // Build set of debtor names (normalized) for filtering clients
    const debtorNamesSet = new Set<string>();
    const activeDebtorRows: { row: any[]; name: any; normalizedName: string }[] = [];

    for (let i = 1; i < debtorsDataRaw.length; i++) {
      const row = debtorsDataRaw[i];
      const name = row[idxNameDebtors];
      
      // Filtro de Datas: Ignorar se houver Data de Baixa ou Data de Pagamento preenchida
      const hasLowerDate = idxLowerDate !== -1 && row[idxLowerDate] !== undefined && row[idxLowerDate] !== null && String(row[idxLowerDate]).trim() !== "";
      const hasPaymentDate = idxPaymentDate !== -1 && row[idxPaymentDate] !== undefined && row[idxPaymentDate] !== null && String(row[idxPaymentDate]).trim() !== "";

      if (hasLowerDate || hasPaymentDate) {
        continue; // Pula essa linha (já descontada do total de extraídos/encontrados)
      }
      
      if (name) {
        totalLinesProcessed++;
        const normName = normalizeText(name);

        // Register this as a debtor name
        debtorNamesSet.add(normName);
        activeDebtorRows.push({ row, name, normalizedName: normName });

        const phone = phoneMap.get(normName);
        const value = idxValue !== -1 ? row[idxValue] : '';
        const dueDate = idxDueDate !== -1 ? formatDate(row[idxDueDate]) : '';

        if (phone || !clientsFile) {
          // Normaliza os dados para comparação de duplicatas
          const normalizedPhone = phone ? phone.replace(/\D/g, '') : 'sem-telefone';
          
          // Chave única para o relatório completo: Nome + Telefone (ou 'sem-telefone') + Data de Vencimento
          const entryKeyDetailed = `${normName}|${normalizedPhone}|${dueDate}`;
          
          // Lógica para Relatório Simples: Apenas um por telefone (ou nome se sem telefone)
          const simpleKey = phone ? normalizedPhone : normName;
          if (!seenPhonesSimple.has(simpleKey)) {
            resultData.push([name, phone || '']);
            seenPhonesSimple.add(simpleKey);
            foundCount++;
          }

          // Lógica para Relatório Completo: Permite duplicatas se a data de vencimento for diferente
          if (!seenEntriesDetailed.has(entryKeyDetailed)) {
            detailedData.push([name, phone || '', value, dueDate]);
            seenEntriesDetailed.add(entryKeyDetailed);
            foundDetailedCount++;
          }
        } else {
          resultData.push([name, '']);
          detailedData.push([name, '', value, dueDate]);
          missingCount++;
        }
      }
    }

    // 5. Build "Sem Devedores" spreadsheet (clients NOT in debtors list, with extra columns)
    processingStage = "montagem da planilha sem devedores";
    let semDevedoresData: Uint8Array | undefined;
    let semDevedoresCount = 0;

    if (clientsDataRaw && clientsDataRaw.length >= 2 && colNameClients) {
      const idxNameClients = clientsHeader.indexOf(colNameClients);

      // Build header row: Nome + extra columns found
      const semDevedoresHeader = ['Nome', ...extraColNames];
      const semDevedoresRows: any[][] = [semDevedoresHeader];

      const seenClientNames = new Set<string>();

      for (let i = 1; i < clientsDataRaw.length; i++) {
        const row = clientsDataRaw[i];
        const name = row[idxNameClients];
        if (!name) continue;

        const normName = normalizeText(name);

        // Only include clients NOT in the debtors list
        if (debtorNamesSet.has(normName)) continue;

        // Deduplicate by normalized name
        if (seenClientNames.has(normName)) continue;
        seenClientNames.add(normName);

        const extraValues = extraColIndices.map(idx => {
          if (idx === -1) return '';
          const val = row[idx];
          if (val === undefined || val === null) return '';
          return val;
        });

        semDevedoresRows.push([name, ...extraValues]);
        semDevedoresCount++;
      }

      const wsSem = XLSX.utils.aoa_to_sheet(semDevedoresRows);
      const wbSem = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wbSem, wsSem, "Sem Devedores");
      semDevedoresData = new Uint8Array(XLSX.write(wbSem, { bookType: 'xlsx', type: 'array' }));
    }

    // Additional normalized exports; the existing reports above remain unchanged.
    processingStage = "montagem das planilhas completas";
    let semDevedoresCompletaData: Uint8Array | undefined;
    let devedoresCompletaData: Uint8Array | undefined;
    let semDevedoresCompletaCount = 0;
    let devedoresCompletosCount = 0;

    if (clientsDataRaw && completeClientNameIndex !== -1) {
      const completeHeaders = [
        COMPLETE_EXPORT_FIELDS[0].label,
        "Telefone/WhatsApp",
        ...COMPLETE_EXPORT_FIELDS.slice(1).map(field => field.label),
        ...COMPLETE_EXTRA_GROUPS.map(group => group.label),
      ];
      const completeSemRows: any[][] = [completeHeaders];

      completeClientRecords.forEach((record, normalizedName) => {
        if (debtorNamesSet.has(normalizedName)) return;
        completeSemRows.push([
          record.name,
          record.phones.join(" / "),
          ...COMPLETE_EXPORT_FIELDS.slice(1).map(field => record.values.get(field.label) ?? ""),
          ...COMPLETE_EXTRA_GROUPS.map(group => record.values.get(group.label) ?? ""),
        ]);
        semDevedoresCompletaCount++;
      });

      const debtorGroups = new Map<string, { name: any; rows: any[][] }>();
      for (const debtor of activeDebtorRows) {
        let group = debtorGroups.get(debtor.normalizedName);
        if (!group) {
          group = { name: debtor.name, rows: [] };
          debtorGroups.set(debtor.normalizedName, group);
        }
        group.rows.push(debtor.row);
      }

      const groupedDebtors = Array.from(debtorGroups.entries());
      const phonesByDebtor = new Map<string, string[]>();
      let maxPhoneColumns = 1;
      let maxInstallmentColumns = 0;
      for (const [normalizedName, group] of groupedDebtors) {
        const debtorPhoneValues = group.rows.reduce<any[]>((values, row) => {
          values.push(...completeDebtorPhoneIndices.map(index => row[index]));
          return values;
        }, []);
        const phones = uniquePhoneValues([
          ...(completeClientRecords.get(normalizedName)?.phones ?? []),
          ...debtorPhoneValues,
        ]);
        phonesByDebtor.set(normalizedName, phones);
        maxPhoneColumns = Math.max(maxPhoneColumns, phones.length);
        maxInstallmentColumns = Math.max(maxInstallmentColumns, group.rows.length);
      }

      const phoneHeaders = Array.from(
        { length: maxPhoneColumns },
        (_, index) => `Telefone/WhatsApp ${index + 1}`,
      );
      const installmentHeaders: string[] = [];
      for (let index = 1; index <= maxInstallmentColumns; index++) {
        installmentHeaders.push(
          `Parcela ${index} - Nº da Parcela`,
          `Parcela ${index} - Valor`,
          `Parcela ${index} - Vencimento`,
        );
      }

      const completeDebtorHeaders = [
        COMPLETE_EXPORT_FIELDS[0].label,
        ...phoneHeaders,
        "E-mail",
        "CPF/CNPJ",
        "Valor Total da Dívida",
        "Total de Parcelas",
        "Nº Documento",
        "Descrição",
        "Data da Venda",
        ...COMPLETE_EXTRA_GROUPS.map(group => group.label),
        ...installmentHeaders,
      ];
      const completeDebtorRows: any[][] = [completeDebtorHeaders];
      const installmentNumberIndex = completeDebtorFieldIndices.get("Nº Parcela") ?? -1;
      const installmentValueIndex = completeDebtorFieldIndices.get("Valor") ?? -1;
      const installmentDueDateIndex = completeDebtorFieldIndices.get("Vencimento") ?? -1;
      const totalInstallmentsIndex = completeDebtorFieldIndices.get("Total de Parcelas") ?? -1;
      const emailIndex = completeDebtorFieldIndices.get("E-mail") ?? -1;
      const descriptionIndex = completeDebtorFieldIndices.get("Descrição") ?? -1;
      const saleDateIndex = completeDebtorFieldIndices.get("Data da Venda") ?? -1;

      for (const [normalizedName, group] of groupedDebtors) {
        const clientRecord = completeClientRecords.get(normalizedName);
        let totalDebtInCents = 0;
        const installmentAmounts: (number | "")[] = [];
        for (let rowIndex = 0; rowIndex < group.rows.length; rowIndex++) {
          const row = group.rows[rowIndex];
          if (installmentValueIndex < 0 || !hasCellValue(row[installmentValueIndex])) {
            installmentAmounts.push("");
            continue;
          }
          const amount = parseCurrencyAmount(row[installmentValueIndex]);
          if (amount === null) {
            throw new Error("Há um valor não numérico na coluna Valor da planilha de devedores.");
          }
          totalDebtInCents += Math.round(amount * 100);
          installmentAmounts.push(amount);
        }

        const aggregatedField = (label: string, columnIndex: number, formatter?: (value: any) => any) => {
          const value = aggregateColumnValues(group.rows, columnIndex, formatter);
          return hasCellValue(value) ? value : (clientRecord?.values.get(label) ?? "");
        };
        const debtorCpfCnpj = group.rows.map(row => (
          combineUniqueDocumentValues(row, completeDebtorCpfCnpjIndices)
        ));
        const cpfCnpj = aggregateCellValues(debtorCpfCnpj, value => String(value).trim())
          || clientRecord?.values.get("CPF/CNPJ")
          || "";
        const documentNumber = aggregateColumnsAcrossRows(group.rows, completeDebtorDocumentIndices)
          || clientRecord?.values.get("Nº Documento")
          || "";
        const saleDate = aggregatedField("Data da Venda", saleDateIndex, formatDate)
          || clientRecord?.values.get("Dt. Últ. Compra")
          || "";
        const debtorExtraValues = COMPLETE_EXTRA_GROUPS.map(groupField => {
          const clientValue = clientRecord?.values.get(groupField.label);
          if (hasCellValue(clientValue)) return clientValue;
          const columnIndex = completeDebtorExtraFieldIndices.get(groupField.label) ?? -1;
          return aggregateColumnValues(group.rows, columnIndex);
        });

        const installmentValues: any[] = [];
        for (let index = 0; index < maxInstallmentColumns; index++) {
          const row = group.rows[index];
          if (!row) {
            installmentValues.push("", "", "");
            continue;
          }
          const originalInstallmentNumber = installmentNumberIndex >= 0 && hasCellValue(row[installmentNumberIndex])
            ? row[installmentNumberIndex]
            : index + 1;
          const installmentValue = installmentAmounts[index] ?? "";
          const dueDate = installmentDueDateIndex >= 0
            ? formatDate(row[installmentDueDateIndex])
            : "";
          installmentValues.push(originalInstallmentNumber, installmentValue, dueDate);
        }

        completeDebtorRows.push([
          clientRecord?.name ?? group.name,
          ...Array.from({ length: maxPhoneColumns }, (_, index) => phonesByDebtor.get(normalizedName)?.[index] ?? ""),
          aggregatedField("E-mail", emailIndex),
          cpfCnpj,
          totalDebtInCents / 100,
          aggregatedField("Total de Parcelas", totalInstallmentsIndex),
          documentNumber,
          aggregatedField("Descrição", descriptionIndex),
          saleDate,
          ...debtorExtraValues,
          ...installmentValues,
        ]);
      }
      devedoresCompletosCount = groupedDebtors.length;

      const createSpreadsheet = (rows: any[][], sheetName: string) => {
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        return new Uint8Array(XLSX.write(workbook, { bookType: "xlsx", type: "array" }));
      };

      semDevedoresCompletaData = createSpreadsheet(completeSemRows, "Sem Devedores");
      devedoresCompletaData = createSpreadsheet(completeDebtorRows, "Devedores");
    }

    // 6. Generate Outputs
    processingStage = "geração dos arquivos Excel";
    const generateBuffer = (data: any[][]) => {
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Resultado");
      return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    };

    const wbout = generateBuffer(resultData);
    const detailedWbout = generateBuffer(detailedData);

    const dateStr = new Date().toISOString().slice(0,10);
    return {
      success: true,
      data: new Uint8Array(wbout),
      detailedData: new Uint8Array(detailedWbout),
      semDevedoresData,
      semDevedoresCompletaData,
      devedoresCompletaData,
      stats: {
        total: totalLinesProcessed,
        found: foundCount,
        foundDetailed: foundDetailedCount,
        missing: missingCount,
        semDevedores: semDevedoresCount,
        semDevedoresCompleta: semDevedoresCompletaCount,
        devedoresCompletos: devedoresCompletosCount,
      },
      fileName: `resultado_simples_${dateStr}.xlsx`,
      detailedFileName: `resultado_detalhado_${dateStr}.xlsx`,
      semDevedoresFileName: `clientes_sem_devedores_${dateStr}.xlsx`,
      semDevedoresCompletaFileName: `clientes_completos_sem_devedores_${dateStr}.xlsx`,
      devedoresCompletaFileName: `devedores_com_dados_completos_${dateStr}.xlsx`,
    };

  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`Erro ao processar planilhas durante "${processingStage}": ${detail}`);
    return {
      success: false,
      message: `Erro ao processar arquivos durante "${processingStage}". Detalhe: ${detail}`,
    };
  }
}
