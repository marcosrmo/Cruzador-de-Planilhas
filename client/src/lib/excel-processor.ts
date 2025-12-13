import * as XLSX from 'xlsx';

// Utility to normalize text (remove accents, lowercase, trim)
export function normalizeText(text: any): string {
  if (!text) return '';
  const str = String(text).trim().toLowerCase();
  // Remove accents
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  stats?: {
    total: number;
    found: number;
    missing: number;
  };
  fileName?: string;
}

export async function processFiles(
  clientsFile: File, 
  debtorsFile: File
): Promise<ProcessResult> {
  try {
    // 1. Read files
    const readExcel = async (file: File) => {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      return XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Read as array of arrays
    };

    const clientsDataRaw = await readExcel(clientsFile) as any[][];
    const debtorsDataRaw = await readExcel(debtorsFile) as any[][];

    if (clientsDataRaw.length < 2 || debtorsDataRaw.length < 2) {
      return { success: false, message: "Uma das planilhas parece estar vazia." };
    }

    // 2. Identify columns
    const clientsHeader = clientsDataRaw[0] as string[];
    const debtorsHeader = debtorsDataRaw[0] as string[];

    const colNameClients = findSimilarColumn(clientsHeader, 'nome');
    const colPhoneClients = findSimilarColumn(clientsHeader, 'telefone');
    const colNameDebtors = findSimilarColumn(debtorsHeader, 'nome');

    if (!colNameClients || !colPhoneClients) {
      return { 
        success: false, 
        message: `Não foi possível encontrar as colunas 'Nome' ou 'Telefone' na planilha geral. Colunas encontradas: ${clientsHeader.join(', ')}` 
      };
    }

    if (!colNameDebtors) {
      return { 
        success: false, 
        message: `Não foi possível encontrar a coluna 'Nome' na planilha de devedores. Colunas encontradas: ${debtorsHeader.join(', ')}` 
      };
    }

    // 3. Index data
    const idxNameClients = clientsHeader.indexOf(colNameClients);
    const idxPhoneClients = clientsHeader.indexOf(colPhoneClients);
    const idxNameDebtors = debtorsHeader.indexOf(colNameDebtors);

    // Map: Normalized Name -> Phone
    const phoneMap = new Map<string, string>();

    // Skip header (start at 1)
    for (let i = 1; i < clientsDataRaw.length; i++) {
      const row = clientsDataRaw[i];
      const name = row[idxNameClients];
      const phone = row[idxPhoneClients];

      if (name) {
        const normName = normalizeText(name);
        // If duplicates exist, this takes the last one. Could be improved to take first or list all.
        // For simplicity matching the python script which seemingly takes one.
        if (phone) {
            phoneMap.set(normName, String(phone));
        }
      }
    }

    // 4. Process debtors
    const resultData = [['Nome Original', 'Telefone Encontrado', 'Status']];
    let foundCount = 0;
    let missingCount = 0;

    for (let i = 1; i < debtorsDataRaw.length; i++) {
      const row = debtorsDataRaw[i];
      const name = row[idxNameDebtors];
      
      if (name) {
        const normName = normalizeText(name);
        const phone = phoneMap.get(normName);

        if (phone) {
          resultData.push([name, phone, 'Encontrado']);
          foundCount++;
        } else {
          resultData.push([name, '', 'Não encontrado']);
          missingCount++;
        }
      }
    }

    // 5. Generate Output
    const ws = XLSX.utils.aoa_to_sheet(resultData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultado");

    // Generate buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    return {
      success: true,
      data: new Uint8Array(wbout),
      stats: {
        total: foundCount + missingCount,
        found: foundCount,
        missing: missingCount
      },
      fileName: `resultado_cobranca_${new Date().toISOString().slice(0,10)}.xlsx`
    };

  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao processar arquivos. Verifique se são arquivos Excel válidos." };
  }
}
