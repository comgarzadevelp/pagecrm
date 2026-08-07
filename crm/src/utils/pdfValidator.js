import * as pdfjsLib from 'pdfjs-dist';

// Configuración obligatoria del worker (RIESGO-07)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

const KEYWORDS = ['cotización', 'cotizacion', 'precio', 'total', 'subtotal', 'iva', 'importe', 'vigencia'];

export const validateQuotePDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Iterar por todas las páginas y extraer textContent
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + ' ';
    }
    
    const normalizedText = fullText.toLowerCase();
    
    let score = 0;
    KEYWORDS.forEach(keyword => {
      if (normalizedText.includes(keyword)) {
        score++;
      }
    });
    
    let isValid = score >= 3;
    let reason = isValid ? 'PDF válido' : `No parece una cotización. Coincidencias: ${score}/3 requeridas.`;

    // Fallback para PDFs basados en imágenes/canvas (como los generados por el cotizador interno de la app)
    if (!isValid && fullText.trim().length === 0) {
      const filenameNormalized = file.name.toLowerCase();
      const filenameKeywords = ['cotizacion', 'cotización', 'precio', 'total', 'subtotal', 'iva', 'importe', 'vigencia', 'quote', 'invoice', 'presupuesto'];
      const hasKeywordInName = filenameKeywords.some(kw => filenameNormalized.includes(kw));

      if (hasKeywordInName) {
        isValid = true;
        score = 3;
        reason = 'PDF válido (Detectado como imagen/escaneo con palabra clave en el nombre de archivo)';
      }
    }

    return {
      isValid,
      score,
      reason
    };
  } catch (error) {
    console.error('Error al validar PDF:', error);
    return {
      isValid: false,
      score: 0,
      reason: 'Error al leer el archivo PDF. Archivo corrupto o no es PDF válido.'
    };
  }
};
