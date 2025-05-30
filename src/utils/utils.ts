import 'dotenv/config';
import { OpenAI } from 'openai';
import FirecrawlApp from '@mendable/firecrawl-js';

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
}
