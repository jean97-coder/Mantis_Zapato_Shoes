// html2canvas-pro (not the original html2canvas, which is unmaintained and
// throws on modern CSS color functions) — Tailwind v4 emits oklch() colors
// everywhere, and only the -pro fork can parse those while rasterizing.
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

async function renderCanvas(node: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(node, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  });
}

/**
 * Rasterizes a printable document (ticket / sales note) to a PNG and
 * triggers a download. Ideal for attaching a clean image directly in
 * WhatsApp Web without having to print-to-PDF first.
 */
export async function exportNodeAsPng(node: HTMLElement, fileName: string): Promise<void> {
  const canvas = await renderCanvas(node);
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  link.click();
}

/**
 * Rasterizes a printable document and embeds it into a single-page PDF
 * sized to the content itself (no forced A4 crop / blank second page).
 */
export async function exportNodeAsPdf(node: HTMLElement, fileName: string): Promise<void> {
  const canvas = await renderCanvas(node);
  const imgData = canvas.toDataURL('image/png', 1.0);

  // Convert the raster's pixel size to millimeters (96 CSS px/in) so the
  // PDF page is exactly the size of the content — one page, no cropping.
  const widthMm = (canvas.width / 2) * (25.4 / 96);
  const heightMm = (canvas.height / 2) * (25.4 / 96);

  const pdf = new jsPDF({
    orientation: widthMm > heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

/**
 * Rasterizes a (potentially long) document and slices it across standard
 * Letter-size pages, instead of forcing everything onto one oversized page.
 * Used for reports that can run to many rows (e.g. a full day's cash
 * movements) where a real, paginated business document reads better than
 * one giant image.
 */
export async function exportNodeAsPaginatedPdf(node: HTMLElement, fileName: string): Promise<void> {
  const canvas = await renderCanvas(node);

  const marginMm = 10;
  const pageWidthMm = 215.9; // Letter
  const pageHeightMm = 279.4;
  const contentWidthMm = pageWidthMm - marginMm * 2;
  const contentHeightMmPerPage = pageHeightMm - marginMm * 2;

  const pxPerMm = canvas.width / contentWidthMm;
  const pageHeightPx = Math.floor(contentHeightMmPerPage * pxPerMm);
  const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    const sourceY = page * pageHeightPx;
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - sourceY);

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;
    const ctx = sliceCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    const sliceHeightMm = sliceHeightPx / pxPerMm;
    pdf.addImage(sliceCanvas.toDataURL('image/png', 1.0), 'PNG', marginMm, marginMm, contentWidthMm, sliceHeightMm);
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
