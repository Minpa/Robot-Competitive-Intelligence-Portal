import { createWorker, PSM } from 'tesseract.js';

/**
 * Extract text from a base64-encoded image using Tesseract OCR.
 */
export async function extractTextFromBase64(base64: string): Promise<string> {
  const match = base64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  const b64 = match ? match[2] : base64;
  if (!b64) return '';

  const buffer = Buffer.from(b64, 'base64');
  const worker = await createWorker({ logger: () => {} });

  try {
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });

    const { data } = await worker.recognize(buffer);
    return data?.text || '';
  } finally {
    await worker.terminate();
  }
}
