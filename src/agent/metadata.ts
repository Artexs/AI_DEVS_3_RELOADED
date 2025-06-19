import type { IDoc } from '../types/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates standardized metadata for documents.
 * 
 * @param params - Parameters to include in the metadata.
 * @returns A standardized metadata object.
 */
function generateMetadata(params: {
  source: string;
  name: string;
  mimeType: string;
  conversation_uuid?: string;
  description?: string;
  additional?: Record<string, any>;
}): Record<string, any> {
  return {
    uuid: uuidv4(),
    source_uuid: uuidv4(),
    conversation_uuid: params.conversation_uuid || '',
    source: params.source,
    name: params.name,
    mimeType: params.mimeType,
    description: params.description,
    ...params.additional,
  };
}

export function document(content: string, modelName?: string, metadataOverrides?: Record<string, any>): IDoc {
  const baseMetadata = generateMetadata({
    source: metadataOverrides?.source || 'generated',
    name: metadataOverrides?.name || 'Generated Document',
    mimeType: metadataOverrides?.mimeType || 'text/plain',
    conversation_uuid: metadataOverrides?.conversation_uuid,
    additional: metadataOverrides?.additional || {},
  });

  return {
    text: content,
    metadata: {
      ...baseMetadata,
      ...metadataOverrides,
    },
  };
}