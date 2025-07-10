import { Utils, Logger } from '../../index';
import { IDoc } from '../../types/types';
import { document } from '../metadata'
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

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
            // Determine if URL is for centrala
            const isCentrala = url.includes('ag3nts.org');
            let suffix = url.includes('/') ? url.split('/').pop() : url;
            if (!suffix) {
                throw new Error(`Invalid URL or suffix provided: ${url}`);
            }
            await this.logger.log(`Loading data for ${suffix}`);
            let content: string | undefined;
            const dataDir = path.join(process.cwd(), 'data/agent');
            const filePath = path.join(dataDir, suffix);
            if (isCentrala) {
                // Use existing centrala logic
                await this.logger.log(`downloading file from c3ntrala with ${suffix}`);
                const contentJSON = await this.utils.getFileFromCentrala(suffix, 'data/agent/');
                content = JSON.stringify(contentJSON);
            } else {
                // Download from the internet
                try {
                    // Ensure directory exists
                    await fs.mkdir(dataDir, { recursive: true });
                    const fetch = (await import('node-fetch')).default;
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    await fs.writeFile(filePath, buffer);
                    content = `Downloaded file saved to ${filePath}`;
                } catch (err) {
                    await this.logger.log(`Error downloading file from ${url}: ${err}`);
                    throw err;
                }
            }
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

