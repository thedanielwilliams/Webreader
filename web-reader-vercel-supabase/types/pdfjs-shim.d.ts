declare module 'pdfjs-dist/build/pdf' {
  export const GlobalWorkerOptions: any;
  export function getDocument(params: any): any;
}

declare module 'pdfjs-dist/build/pdf.worker.min.js' {
  const src: string;
  export = src;
}