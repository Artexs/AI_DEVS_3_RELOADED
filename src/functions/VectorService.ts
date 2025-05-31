import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbeddings } from '@langchain/openai';

export interface Report {
  name: string;
  content: string;
  date: string;
}

export class VectorService {
  private client: QdrantClient;
  private embeddings: OpenAIEmbeddings;
  private readonly collectionName: string;

  constructor(collectionName: string) {
    if (!process.env.QDRANT_URL) {
      throw new Error('QDRANT_URL environment variable is not set');
    }

    this.client = new QdrantClient({ 
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY
    });

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-large'
    });

    this.collectionName = collectionName;
  }

  async initialize(): Promise<void> {
    try {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: 3072,
          distance: 'Cosine'
        }
      });
    } catch (e) {
      console.log('Collection might already exist');
    }
  }

  async uploadReports(reports: Report[]): Promise<void> {
    const points = await Promise.all(reports.map(async (report, idx) => {
      const embedding = await this.embeddings.embedQuery(report.content);
      return {
        id: idx,
        vector: embedding,
        payload: {
          name: report.name,
          content: report.content,
          date: report.date
        }
      };
    }));

    await this.client.upsert(this.collectionName, { points });
  }

  async search(query: string): Promise<string | undefined> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    const searchResult = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit: 1
    });

    const payload = searchResult[0]?.payload as { date: string } | undefined;
    return payload?.date;
  }
}
