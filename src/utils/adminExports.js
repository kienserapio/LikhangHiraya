import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const BRAND_BROWN_RGB = [85, 55, 34];
const BRAND_CREAM_RGB = [252, 246, 239];
const TEXT_SOFT_RGB = [127, 115, 108];

function humanizeKey(key) {
  return String(key || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function safeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return value;
}

function sanitizeFileName(value, fallback = "export") {
  const cleaned = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || fallback;
}

function exportTimestampLabel() {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function resolveColumns(rows, columns) {
  if (Array.isArray(columns) && columns.length > 0) {
    return columns.map((column) => ({
      key: String(column?.key || ""),
      label: String(column?.label || humanizeKey(column?.key || "")),
      value: typeof column?.value === "function" ? column.value : null,
    }));
  }

  const sample = rows[0] || {};
  return Object.keys(sample).map((key) => ({
    key,
    label: humanizeKey(key),
    value: null,
  }));
}

function mapRows(rows, columns) {
  return rows.map((row) => {
    const next = {};

    for (const column of columns) {
      const raw = column.value ? column.value(row) : row?.[column.key];
      next[column.label] = safeValue(raw);
    }

    return next;
  });
}

export function exportRowsToExcel({
  rows = [],
  columns = [],
  fileName = "likhang-hiraya-export",
  sheetName = "Data",
}) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const resolvedColumns = resolveColumns(sourceRows, columns);
  const worksheetRows = mapRows(sourceRows, resolvedColumns);

  const worksheet = XLSX.utils.json_to_sheet(worksheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, String(sheetName || "Data").slice(0, 31));

  XLSX.writeFile(workbook, `${sanitizeFileName(fileName)}.xlsx`);
}

export function exportRowsToPdf({
  title = "Likhang Hiraya Report",
  rows = [],
  columns = [],
  fileName = "likhang-hiraya-export",
}) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const resolvedColumns = resolveColumns(sourceRows, columns);

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BRAND_CREAM_RGB);
  doc.rect(0, 0, pageWidth, 74, "F");

  doc.setTextColor(...BRAND_BROWN_RGB);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Likhang Hiraya", 40, 34);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(String(title || "Report"), 40, 54);

  doc.setTextColor(...TEXT_SOFT_RGB);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated: ${exportTimestampLabel()}`, 40, 68);

  const head = [resolvedColumns.map((column) => column.label)];
  const body = sourceRows.map((row) =>
    resolvedColumns.map((column) => {
      const raw = column.value ? column.value(row) : row?.[column.key];
      return String(safeValue(raw));
    })
  );

  autoTable(doc, {
    startY: 90,
    head,
    body,
    margin: { left: 40, right: 40 },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      textColor: [67, 49, 37],
      lineColor: [226, 211, 198],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: BRAND_BROWN_RGB,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: BRAND_CREAM_RGB,
    },
  });

  doc.save(`${sanitizeFileName(fileName)}.pdf`);
}
