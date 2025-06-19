import { Utils, Logger } from '../../index';
import { IDoc } from '../../types/types';
import { document } from '../metadata'
import { v4 as uuidv4 } from 'uuid';

export class DownloaderTool {
    private readonly utils: Utils;
    private readonly logger: Logger;
    private phoneData: any[] = [];

    constructor(logger: Logger) {
        this.utils = new Utils;
        this.logger = logger;
    }

    async getDataFromCentrala(urls: string[], conversation_uuid: string): Promise<IDoc[]> {
        console.log(`TEST TEST TEST FROM getDataFromCentrala with urls ${urls}`)
        const docs = await Promise.all(urls.map(async (url) => {
            // Extract suffix from URL if full URL is provided
            const suffix = url.includes('/') 
                ? url.split('/').pop() 
                : url;

            if (!suffix) {
                throw new Error(`Invalid URL or suffix provided: ${url}`);
            }

            // Download and save data
            await this.logger.log(`Loading data for ${suffix}`);
            const contentJSON = await this.utils.getFileFromCentrala(suffix, 'data/agent/');
            const content = JSON.stringify(contentJSON)

            return document(content, 'gpt-4o', {
                name: `${suffix}`,
                description: `This is a result of a downloading from the url: "${url}"`,
                source: url,
                content_type: true ? 'complete' : 'chunk',
                conversation_uuid,
            });
        }));

        return docs;
    }
}

