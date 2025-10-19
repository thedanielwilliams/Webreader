import { useEffect, useRef, useState } from 'react';

export default function UploaderPage() {
  const [pdfLib, setPdfLib] = useState<any>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(0);
  const [bookId, setBookId] = useState<string>('doorhinge');
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist/build/pdf');
        (pdfjsLib as any).GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        if (mounted) setPdfLib(pdfjsLib);
      } catch (e: any) {
        setStatus('Error loading PDF library: ' + (e?.message || String(e)));
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function renderPageToPng(doc: any, pageNo: number): Promise<Blob> {
    const page = await doc.getPage(pageNo);
    const viewport = page.getViewport({ scale: 150 / 96 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvasContext: ctx as any, viewport }).promise;
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
    return blob;
  }

  async function blobToBase64(blob: Blob): Promise<string> {
    const buf = await blob.arrayBuffer();
    const uint8 = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
    return btoa(binary);
  }

  async function onUpload() {
    try {
      if (!pdfFile) {
        setStatus('Select a PDF first.');
        return;
      }
      if (!pdfLib) {
        setStatus('PDF library not loaded yet.');
        return;
      }
      setStatus('Loading PDF…');
      const data = await pdfFile.arrayBuffer();
      const doc = await (pdfLib as any).getDocument({ data }).promise;
      setPageCount(doc.numPages);
      const s = Math.max(1, startPage);
      const e = Math.min(endPage, doc.numPages);

      for (let p = s; p <= e; p++) {
        setStatus(`Rendering page ${p}/${doc.numPages}…`);
        const pngBlob = await renderPageToPng(doc, p);
        const b64 = await blobToBase64(pngBlob);
        setStatus(`Uploading page ${p}…`);
        const res = await fetch('/api/upload_page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, pageNo: p, pngBase64: b64 }),
        });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg);
        }
      }
      setStatus('Done. Open the viewer to check.');
    } catch (e: any) {
      setStatus('Error: ' + (e?.message || String(e)));
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: 24 }}>
      <h1>Uploader</h1>
      <p>Render PDF pages (150 DPI) in your browser and upload to storage. Sign in first.</p>
      <div style={{ display: 'grid', gap: 12 }}>
        <label>
          Book ID
          <input value={bookId} onChange={(e) => setBookId(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>
        <label>
          PDF File
          <input ref={inputRef} type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
        </label>
        <div style={{ display: 'flex', gap: 12 }}>
          <label>Start Page <input type="number" value={startPage} onChange={(e) => setStartPage(Number(e.target.value))} style={{ width: 100 }} /></label>
          <label>End Page <input type="number" value={endPage} onChange={(e) => setEndPage(Number(e.target.value))} style={{ width: 100 }} /></label>
        </div>
        <button onClick={onUpload} style={{ padding: '8px 12px' }} disabled={!pdfLib}>Render + Upload</button>
        <p style={{ color: status.startsWith('Error') ? 'red' : '#555' }}>{status}</p>
        <p>Viewer: <a href={`/viewer/${encodeURIComponent(bookId)}/1`} target="_blank">/viewer/{bookId}/1</a></p>
        <p>Sign in: <a href="/signin" target="_blank">/signin</a></p>
      </div>
    </main>
  );
}