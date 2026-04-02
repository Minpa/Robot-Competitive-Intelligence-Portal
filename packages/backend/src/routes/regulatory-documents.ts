import type { FastifyInstance } from 'fastify';
import { regulatoryDocumentService } from '../services/regulatory-document.service.js';
import fs from 'fs';

export async function regulatoryDocumentRoutes(fastify: FastifyInstance) {
  // List documents
  fastify.get('/', async (request) => {
    const query = request.query as {
      category?: string;
      region?: string;
      search?: string;
      regulationId?: string;
      limit?: string;
      offset?: string;
    };
    return regulatoryDocumentService.listDocuments({
      ...query,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  });

  // Get single document metadata
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const doc = await regulatoryDocumentService.getDocument(id);
    if (!doc) {
      reply.status(404).send({ error: 'Document not found' });
      return;
    }
    return doc;
  });

  // Serve file (for PDF viewer)
  fastify.get('/:id/file', async (request, reply) => {
    const { id } = request.params as { id: string };
    const doc = await regulatoryDocumentService.getDocument(id);
    if (!doc) {
      reply.status(404).send({ error: 'Document not found' });
      return;
    }

    const filePath = regulatoryDocumentService.getFilePath(doc.storedFilename);
    if (!filePath) {
      reply.status(404).send({ error: 'File not found on disk' });
      return;
    }

    const stream = fs.createReadStream(filePath);
    reply
      .header('Content-Type', doc.mimeType)
      .header('Content-Disposition', `inline; filename="${encodeURIComponent(doc.filename)}"`)
      .header('Content-Length', doc.fileSize)
      .send(stream);
  });

  // Upload document
  fastify.post('/upload', async (request) => {
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    let filename = '';
    let mimeType = '';
    const fields: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        fileBuffer = Buffer.concat(chunks);
        filename = part.filename;
        mimeType = part.mimetype;
      } else {
        fields[part.fieldname] = (part as any).value;
      }
    }

    if (!fileBuffer || !filename) {
      throw new Error('No file uploaded');
    }

    return regulatoryDocumentService.uploadDocument({
      title: fields.title || filename,
      description: fields.description,
      filename,
      buffer: fileBuffer,
      mimeType,
      category: fields.category,
      region: fields.region,
      regulationId: fields.regulationId || undefined,
      tags: fields.tags ? JSON.parse(fields.tags) : [],
    });
  });

  // Update document metadata
  fastify.put('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    return regulatoryDocumentService.updateDocument(id, body);
  });

  // Delete document
  fastify.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    await regulatoryDocumentService.deleteDocument(id);
    return { success: true };
  });

  // Link document to checklist item
  fastify.post('/:id/link', async (request) => {
    const { id } = request.params as { id: string };
    const { checklistItemId, pages, note } = request.body as { checklistItemId: string; pages?: string; note?: string };
    return regulatoryDocumentService.linkChecklistItem(id, checklistItemId, pages, note);
  });

  // Unlink document from checklist item
  fastify.post('/:id/unlink', async (request) => {
    const { id } = request.params as { id: string };
    const { checklistItemId } = request.body as { checklistItemId: string };
    return regulatoryDocumentService.unlinkChecklistItem(id, checklistItemId);
  });

  // Get documents linked to a specific checklist item
  fastify.get('/for-checklist/:checklistItemId', async (request) => {
    const { checklistItemId } = request.params as { checklistItemId: string };
    return regulatoryDocumentService.getDocumentsForChecklistItem(checklistItemId);
  });
}
