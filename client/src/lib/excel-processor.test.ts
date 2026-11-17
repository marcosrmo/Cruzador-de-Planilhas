import assert from "node:assert/strict";
import { File } from "node:buffer";
import test from "node:test";
import * as XLSX from "xlsx";
import { processFiles } from "./excel-processor";

function workbookFile(rows: unknown[][], name: string): File {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Dados");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new File([bytes], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function readRows(bytes: Uint8Array | undefined): any[][] {
  assert.ok(bytes, "expected the spreadsheet export to exist");
  const workbook = XLSX.read(bytes, { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as any[][];
}

function makeClientsFile(): File {
  return workbookFile([
    ["Nome do Cliente", "Telefone comercial", "WhatsApp principal", "Fax", "E-mail", "Cidade", "Código cliente"],
    ["Ana Silva", "11 3000-1111", "11 99000-1111", "11 3333-2222", "ana@example.com", "São Paulo", "A-1"],
    ["Bia Souza", "21 3000-2222", "", "", "bia@example.com", "Rio de Janeiro", "B-2"],
    ["Caio Lima", "31 3000-3333", "", "", "caio@example.com", "Belo Horizonte", "C-3"],
  ], "clientes.xlsx");
}

function makeDebtorsFile(): File {
  return workbookFile([
    [
      "Nome do Cliente",
      "Telefone cobrança",
      "WhatsApp cobrança",
      "Fax cobrança",
      "Data de Vencimento",
      "Valor",
      "Data de Pagamento",
      "Data da Baixa",
      "Nota Fiscal",
      "Nosso Número",
      "Nº Parcela",
      "Total de Parcelas",
      "Contrato Interno",
    ],
    ["Ana Silva", "", "11 91111-2222", "11 3333-8888", "2026-05-10", "R$ 120,50", "", "", "NF 000123", "3456789012", 1, 2, "CX-9"],
    ["Ana Silva", "", "", "", "2026-06-10", 80, "", "", "NF-77", "1234567", 2, 2, "CX-9"],
    ["Ana Silva", "", "", "11 8888-7777", "2026-07-10", 999, "2026-07-12", "", "NF 999", "9999999999", 3, 3, "PAGO"],
    ["Bia Souza", "21 2222-9999", "", "21 3333-8888", "2026-04-10", 50, "", "2026-04-12", "NF 55", "55555555", 1, 1, "BAIXADO"],
  ], "devedores.xlsx");
}

test("separa débitos em aberto, organiza telefones e mantém campos extras", async () => {
  const result = await processFiles(makeClientsFile(), makeDebtorsFile());
  assert.equal(result.success, true, result.message);
  assert.equal(result.stats?.total, 2, "paid rows should not count as open debt");
  assert.equal(result.stats?.devedoresCompletos, 1);
  assert.equal(result.stats?.semDevedoresCompleta, 2);

  const debtorRows = readRows(result.devedoresCompletaData);
  const debtorHeaders = debtorRows[0].map(String);
  const debtor = debtorRows[1];

  assert.equal(debtorRows.length, 2, "only the client with open debt belongs in the debtor sheet");
  assert.ok(debtorHeaders.includes("Telefone 1"));
  assert.ok(debtorHeaders.includes("Telefone 5"), "client and debtor phone, WhatsApp, and fax columns should be combined");
  assert.ok(!debtorHeaders.some(header => (
    header.includes("Telefone/WhatsApp") || header.toUpperCase() === "FONE" || header.toUpperCase().startsWith("FONE ")
  )));
  assert.equal(debtor[debtorHeaders.indexOf("Nota Fiscal")], "NF-77", "the shortest document number should be selected");
  assert.equal(debtor[debtorHeaders.indexOf("Valor Total da Dívida")], 200.5, "settled amounts must not be added");
  assert.equal(debtor[debtorHeaders.indexOf("Contrato Interno")], "CX-9", "unmapped debtor fields should be retained");

  const dueOneIndex = debtorHeaders.indexOf("Vencimento 1");
  const dueTwoIndex = debtorHeaders.indexOf("Vencimento 2");
  assert.ok(dueOneIndex >= 0 && dueTwoIndex > dueOneIndex);
  assert.equal(debtorHeaders[dueOneIndex + 1], "Valor 1");
  assert.equal(debtorHeaders[dueTwoIndex + 1], "Valor 2");
  assert.equal(debtor[dueOneIndex + 1], 120.5);
  assert.equal(debtor[dueTwoIndex + 1], 80);
  assert.ok(!debtor.includes(999), "paid installment amounts must not appear in the debtor sheet");

  const noDebtRows = readRows(result.semDevedoresCompletaData);
  const noDebtHeaders = noDebtRows[0].map(String);
  assert.ok(noDebtHeaders.includes("Telefone 1"));
  assert.ok(noDebtHeaders.includes("Telefone 3"), "paid customer phones and fax should be included");
  assert.equal(noDebtRows.length, 3, "paid customers and customers without debt should be listed once");
  assert.deepEqual(
    noDebtRows.slice(1).map(row => row[0]).sort(),
    ["Bia Souza", "Caio Lima"],
  );

  const bia = noDebtRows.find(row => row[0] === "Bia Souza")!;
  assert.ok(bia.includes("21 3333-8888"), "phones from settled debtor rows should be added to the no-debt export");
  assert.equal(bia[noDebtHeaders.indexOf("Valor")], "");
  assert.equal(bia[noDebtHeaders.indexOf("Vencimento")], "");
});

test("mantém linhas com apenas vencimento como débitos em aberto", async () => {
  const clientsFile = workbookFile([
    ["Nome do Cliente", "Telefone"],
    ["Davi Rocha", "11 95555-1010"],
  ], "clientes.xlsx");
  const debtorsFile = workbookFile([
    ["Nome", "Data de Vencimento", "Valor"],
    ["Davi Rocha", "2026-08-15", 75],
  ], "devedores.xlsx");

  const result = await processFiles(clientsFile, debtorsFile);
  assert.equal(result.success, true, result.message);
  assert.equal(result.stats?.devedoresCompletos, 1);

  const debtorRows = readRows(result.devedoresCompletaData);
  assert.equal(debtorRows.length, 2);
  assert.ok(debtorRows[0].includes("Telefone 1"));
  assert.ok(debtorRows[0].includes("Vencimento 1"));
  assert.ok(debtorRows[0].includes("Valor 1"));
});

test("a extração isolada também conserva telefone, WhatsApp e fax em colunas", async () => {
  const result = await processFiles(null, makeDebtorsFile());
  assert.equal(result.success, true, result.message);

  const rows = readRows(result.detailedData);
  const headers = rows[0].map(String);
  assert.ok(headers.includes("Telefone 1"));
  assert.ok(headers.includes("Telefone 2"));
  assert.ok(!headers.includes("Telefone/WhatsApp"));
  assert.equal(rows.length, 3, "only Ana's two unpaid installments should remain");
  assert.ok(rows[1].includes("11 91111-2222"));
  assert.ok(rows[1].includes("11 3333-8888"));
  assert.ok(!rows.flat().includes(999), "the paid installment should be filtered out");
});
