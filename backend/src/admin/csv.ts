type Cell = string | number | boolean | null | undefined;

/**
 * Builds a CSV that opens cleanly in Excel.
 *
 * Two things matter beyond quoting: a UTF-8 BOM, without which Excel mangles
 * non-ASCII names; and neutralising cells that start with = + - @ (or a tab /
 * carriage return), which spreadsheet apps would otherwise run as formulas —
 * the values are typed by the public, so "=HYPERLINK(...)" in a name field is
 * a real attack ("CSV injection").
 */
export function toCsv(header: string[], rows: Cell[][]): string {
  const line = (cells: Cell[]) => cells.map(escapeCell).join(',');
  return '﻿' + [line(header), ...rows.map(line)].join('\r\n') + '\r\n';
}

export function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
