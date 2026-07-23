import ExcelJS from "exceljs";

export type ImportResult = {
  ok: boolean;
  created: number;
  errors: { row: number; message: string }[];
};

export async function buildWorkbookBuffer(
  sheetName: string,
  headers: string[],
  rows: (string | number | null)[][]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));

  sheet.columns.forEach((col) => {
    col.width = 18;
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function parseWorkbookRows(buffer: Buffer): Promise<Record<string, string>[]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's bundled type defs declare a conflicting global `Buffer extends ArrayBuffer`
  // interface that doesn't structurally match Node's real Buffer; `any` sidesteps it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "").trim();
  });

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const entry: Record<string, string> = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      const value = cell.value;
      const text =
        value == null
          ? ""
          : typeof value === "object" && "result" in value
            ? String((value as { result: unknown }).result ?? "")
            : value instanceof Date
              ? value.toISOString().slice(0, 10)
              : String(value);
      if (text.trim()) hasValue = true;
      entry[header] = text.trim();
    });
    if (hasValue) rows.push(entry);
  });

  return rows;
}
