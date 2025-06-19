import 'dotenv/config';
import { OpenAI } from 'openai';
import FirecrawlApp from '@mendable/firecrawl-js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';

interface RequestOptions {
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: string;
}

interface DatabaseResponse {
    data: any[];
}

interface CentralaRequest {
    task: string;
    apikey: string;
    [key: string]: any;
}

export class Utils {
    private openai: OpenAI;
    private firecrawlApp: FirecrawlApp;

    private readonly config = {
        openaiApiKey: process.env.OPENAI_API_KEY ?? '',
        firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? '',
        centralaUrl: process.env.CENTRALA_URL ?? '',
        poligonApiKey: process.env.POLIGON_API_KEY ?? '',
        aiDevsApiKey: process.env.AI_DEVS_API_KEY ?? ''
    };

    constructor() {
        this.openai = new OpenAI({
            apiKey: this.config.openaiApiKey
        });

        this.firecrawlApp = new FirecrawlApp({
            apiKey: this.config.firecrawlApiKey
        });
    }

    private async makeRequest(url: string, data?: object): Promise<string> {
        console.log(`TEST TEST TEST 123 ${url}, ${JSON.stringify(data)} `)
        const response = await fetch(url, {
            method: data ? 'POST' : 'GET',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            ...(data && { body: JSON.stringify(data) })
        });

        if (!response.ok) 
        {
            console.error(`Request failed: ${url}`)
            console.error(data);
            console.error(response);
            // throw new Error();
        }
        
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    async sendToCentrala(task: string, answer: string): Promise<string> {
        return this.sendToCentralaGlobal(task, {answer}, 'verify');
    }

    async sendToCentralaGlobal(task: string, param: Record<string, any>, suffix: string = 'verify'): Promise<string> {
        return this.makeRequest(
            `${this.config.centralaUrl}/${suffix}`,
            {
                ...(task && { task }),
                apikey: this.config.poligonApiKey,
                ...param
            }
        );
    }

    async getFileFromCentrala(filename: string, fileLocation: string): Promise<any> {
        const dataDir = join(process.cwd(), fileLocation);
        const dataFile = join(dataDir, filename);

        // Create directory if it doesn't exist
        if (!existsSync(dataDir)) {
            await fs.mkdir(dataDir, { recursive: true });
        }

        // Try to load from file first
        if (existsSync(dataFile)) {
            try {
                const data = await fs.readFile(dataFile, 'utf-8');
                return JSON.parse(data);
            } catch (error) {
                console.error('Failed to load data from file:', error);
            }
        }

        // If file doesn't exist or loading failed, fetch from Centrala
        try {
            console.log(`file doesnt exist, downloading... ${filename}`)
            const apiKey = this.config.poligonApiKey;
            if (!apiKey) {
                throw new Error('API key not found in environment variables');
            }

            const url = `https://c3ntrala.ag3nts.org/data/${apiKey}/${filename}`;
            console.log(`file doesnt exist, downloading... from... ${url}`)
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.statusText}`);
            }

            console.log(`file doesnt exist, downloading... result... ${response}`)
            const data = await response.text();
            // const data = await response.json();

            // Save to file
            await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
            console.log(`file doesnt exist, downloading... from... ${data}`)
            return data;
        } catch (error) {
            console.error('Failed to fetch data from Centrala:', error);
            throw error;
        }
    }
}
