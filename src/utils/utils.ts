import 'dotenv/config';
import { OpenAI } from 'openai';
import FirecrawlApp from '@mendable/firecrawl-js';

interface RequestOptions {
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: string;
}

class Utils {
    private openai: OpenAI;
    private firecrawlApp: FirecrawlApp;

    constructor() {
        // Configuration
        // this.CENTRALA_URL = process.env.CENTRALA_URL;
        // this.POLIGON_API_KEY = process.env.POLIGON_API_KEY;
        // this.ROBOT_URL = process.env.ROBOT_URL;
        // this.USERNAME = 'tester';
        // this.PASSWORD = '574e112a';

        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Initialize Firecrawl client
        this.firecrawlApp = new FirecrawlApp({
            apiKey: process.env.FIRECRAWL_API_KEY
        });
    }

    // Generic fetch function
    async fetch(url: string, data?: string, headers?: Record<string, string>): Promise<string> {
        const defaultHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        const options: RequestOptions = {
            method: data ? 'POST' : 'GET',
            headers: {
                ...defaultHeaders,
                ...(headers || {}) // Override defaults with any custom headers
            }
        };

        if (data) {
            options.body = data;
        }
        
        console.log('Request URL:', url);
        console.log('Request Options:', JSON.stringify(options, null, 2));
        
        const response = await fetch(url, options);
        return await response.text();
    }

    async sendToCentrala(task: string, answer: any, suffix: string = 'verify'): Promise<string> {
        const payload = {
            task,
            apikey: process.env.POLIGON_API_KEY,
            answer
        };

        return await this.fetch(
            `${process.env.CENTRALA_URL}/${suffix}`,
            JSON.stringify(payload)
        );
    }

    // Maintain backward compatibility
    async poligonRequest(task: string, answer: any): Promise<string> {
        return this.sendToCentrala(task, answer);
    }
}

export default Utils; 