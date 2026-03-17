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
  stats?: {
    total: number;
    found: number;
    foundDetailed: number; // New field for detailed report count
    missing: number;
  };
  fileName?: string;
  detailedFileName?: string;
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

export async function processFiles(
  clientsFile: File | null, 
  debtorsFile: File
): Promise<ProcessResult> {
  try {
    // 0. Check file sizes
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max
    if (debtorsFile.size > MAX_FILE_SIZE) {
      return {
        success: false,
        message: `⚠️ AVISO: O arquivo de devedores tem ${(debtorsFile.size / 1024 / 1024).toFixed(1)}MB.\n\nIsso é MUITO grande e pode travar o navegador.\n\nSugestão: Divida o arquivo em partes menores (máximo 5MB cada) ou entre em contato para processamento em servidor.`
      };
    }

    if (clientsFile && clientsFile.size > MAX_FILE_SIZE) {
      return {
        success: false,
        message: `⚠️ AVISO: O arquivo de clientes tem ${(clientsFile.size / 1024 / 1024).toFixed(1)}MB.\n\nIsso é MUITO grande e pode travar o navegador.\n\nSugestão: Divida o arquivo em partes menores (máximo 5MB cada).`
      };
    }

    // 1. Read files
    const readExcel = async (file: File) => {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      return XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Read as array of arrays
    };

    const debtorsDataRaw = await readExcel(debtorsFile) as any[][];
    const clientsDataRaw = clientsFile ? await readExcel(clientsFile) as any[][] : null;

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
    const colLowerDate = findSimilarColumn(debtorsHeader, 'data de baixa') ||
                        findSimilarColumn(debtorsHeader, 'data baixa');
    const colPaymentDate = findSimilarColumn(debtorsHeader, 'data de pagamento') ||
                          findSimilarColumn(debtorsHeader, 'data pagamento');
    const colValue = findSimilarColumn(debtorsHeader, 'valor');
    const colDueDate = findSimilarColumn(debtorsHeader, 'data de vencimento') ||
                      findSimilarColumn(debtorsHeader, 'data vencimento');

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
    const phoneMap = new Map<string, string>();
    if (clientsDataRaw && clientsDataRaw.length >= 2) {
      const clientsHeader = clientsDataRaw[0] as string[];
      const colNameClients = findSimilarColumn(clientsHeader, 'nome');
      const colPhoneClients = findSimilarColumn(clientsHeader, 'telefone') || 
                             findSimilarColumn(clientsHeader, 'fone') ||
                             findSimilarColumn(clientsHeader, 'phone');

      console.log("📞 CLIENTS COLUMN MAPPING:", {
        colNameClients,
        colPhoneClients
      });

      if (colNameClients && colPhoneClients) {
        const idxNameClients = clientsHeader.indexOf(colNameClients);
        const idxPhoneClients = clientsHeader.indexOf(colPhoneClients);

        for (let i = 1; i < clientsDataRaw.length; i++) {
          const row = clientsDataRaw[i];
          const name = row[idxNameClients];
          const phone = row[idxPhoneClients];
          if (name) {
            const normName = normalizeText(name);
            if (phone) phoneMap.set(normName, String(phone));
          }
        }
      } else {
        console.warn("⚠️ Não foi possível mapear as colunas de clientes:", { colNameClients, colPhoneClients });
      }
    }

    // 4. Process debtors
    const resultData = [['Nome', 'Telefone']];
    const detailedData = [['Nome', 'Telefone', 'Valor', 'Data de Vencimento']];
    const seenPhonesSimple = new Set<string>(); // Para o relatório simples (apenas Telefone)
    const seenEntriesDetailed = new Set<string>(); // Para o relatório completo (Telefone + Data)
    let totalLinesProcessed = 0;
    let foundCount = 0;
    let foundDetailedCount = 0;
    let missingCount = 0;

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

    // 5. Generate Outputs
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
      stats: {
        total: totalLinesProcessed,
        found: foundCount,
        foundDetailed: foundDetailedCount,
        missing: missingCount
      },
      fileName: `resultado_simples_${dateStr}.xlsx`,
      detailedFileName: `resultado_detalhado_${dateStr}.xlsx`
    };

  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao processar arquivos. Verifique se são arquivos Excel válidos." };
  }
}
