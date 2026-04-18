import styles from "./ExportButtonGroup.module.css";

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3.8h7.5L19.2 8v12.2a1.8 1.8 0 0 1-1.8 1.8H7a1.8 1.8 0 0 1-1.8-1.8V5.6A1.8 1.8 0 0 1 7 3.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 3.8V8h4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.8 15h1.1a1 1 0 0 0 0-2H8.8V17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.3 17v-4h1.1a2 2 0 0 1 0 4h-1.1Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 17v-4h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 15h1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="3.5" width="16" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 3.5v17" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12.5 8.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12.5 12h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12.5 15.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="m5.6 8.3 2.1 3-2.1 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m7.7 8.3-2.1 3 2.1 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ExportButtonGroup({
  onExportPdf,
  onExportExcel,
  disabled = false,
  compact = false,
}) {
  return (
    <div className={`${styles.group} ${compact ? styles.groupCompact : ""}`.trim()}>
      <button
        type="button"
        className={styles.button}
        onClick={onExportPdf}
        disabled={disabled}
        aria-label="Export table as PDF"
      >
        <PdfIcon />
        <span>PDF</span>
      </button>

      <button
        type="button"
        className={styles.button}
        onClick={onExportExcel}
        disabled={disabled}
        aria-label="Export table as Excel"
      >
        <ExcelIcon />
        <span>Excel</span>
      </button>
    </div>
  );
}
