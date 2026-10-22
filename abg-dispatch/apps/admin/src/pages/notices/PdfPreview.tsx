import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, ExternalLink, FileText, Loader2, X } from "lucide-react";
import { fileSize } from "./parts";

interface Props {
  /** Signed, short-lived link from the API (`/api/notice-attachments/...`). */
  url: string;
  name: string;
  sizeBytes: number;
  reference: string;
  onClose: () => void;
}

/**
 * Full-height preview of a notice's PDF in a frame, with download and
 * open-in-tab. The link is signed for ten minutes; the detail page refreshes
 * it before opening this.
 */
export function PdfPreviewModal({ url, name, sizeBytes, reference, onClose }: Props) {
  const [loaded, setLoaded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Keep keyboard focus inside the dialog.
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("a[href], button, iframe")];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last?.focus());
        else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first?.focus());
      }
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="no-print fixed inset-0 z-[70] flex items-stretch justify-center bg-midnight/80 p-0 backdrop-blur-[2px] sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`PDF attachment: ${name}`} className="flex w-full max-w-5xl flex-col overflow-hidden bg-white shadow-raised sm:rounded-2xl">
        <header className="flex items-center gap-3 border-b border-line bg-hero px-4 py-3 text-white sm:px-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-platinum-bright">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-platinum-bright" title={name}>
              {name}
            </p>
            <p className="text-[11px] text-platinum-deep">
              {reference} · PDF · {fileSize(sizeBytes)}
            </p>
          </div>
          <a href={url} download={name} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-sm font-semibold text-platinum-bright transition hover:bg-white/20">
            <Download className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Download</span>
            <span className="sr-only sm:hidden">Download</span>
          </a>
          <a href={url} target="_blank" rel="noopener noreferrer" className="hidden h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-sm font-semibold text-platinum-bright transition hover:bg-white/20 sm:inline-flex">
            <ExternalLink className="h-4 w-4" aria-hidden /> New tab
          </a>
          <button ref={closeRef} className="rounded-lg p-2 text-platinum-bright hover:bg-white/10" onClick={onClose} aria-label="Close preview">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="relative min-h-0 flex-1 bg-silver">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-ink-muted" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening the document…
            </div>
          )}
          <iframe title={`${name} (${reference})`} src={url} className="relative h-full min-h-[70vh] w-full border-0" onLoad={() => setLoaded(true)} />
        </div>
        <footer className="border-t border-line bg-surface px-4 py-2.5 text-center text-xs text-ink-muted sm:px-5">
          Can't see the document on this device?{" "}
          <a href={url} download={name} className="font-semibold text-active hover:underline">
            Download the PDF
          </a>{" "}
          instead. The link is valid for ten minutes.
        </footer>
      </div>
    </div>,
    document.body,
  );
}
