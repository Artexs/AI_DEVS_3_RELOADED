import { Logger } from '../../index';
import { IDoc } from '../../types/types';
import { document } from '../metadata';
import { DatabaseService } from '../../functions/DatabaseService';

export class DatabaseTool {
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    async searchDatabase(parameters: Record<string, any>, conversation_uuid: string): Promise<IDoc[]> {
        const { keywords } = parameters;
        await this.logger.log(`DATABASE_TOOL --- params: ${JSON.stringify(parameters)}`);
        if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
            return [document('Missing or invalid parameter: keywords (array of strings) is required', 'gpt-4o', {
                name: 'error',
                description: 'Parameter validation error',
                source: 'DatabaseTool',
                content_type: 'error',
                conversation_uuid,
            })];
        }
        // Placeholder for actual DB logic
        const dbService = new DatabaseService();
        const docs = await dbService.getDocumentsByKeywords(keywords);
        // For each doc, wrap it using the document() function and return the array
        return docs.map(text => document(text, 'gpt-4o', {
            name: 'database_result',
            description: 'Stubbed database search result',
            source: 'DatabaseTool',
            content_type: 'complete',
            conversation_uuid,
        }));
    }
} 