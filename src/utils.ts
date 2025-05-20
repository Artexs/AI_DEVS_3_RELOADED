import 'dotenv/config';
import { OpenAI } from 'openai';
import FirecrawlApp from '@mendable/firecrawl-js';

interface RequestOptions {
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: string;
}

interface LLMResponse {
    choices: Array<{
        message: {
            content: string | null;
        };
    }>;
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
    async makeRequest(url: string, data?: string, headers?: Record<string, string>): Promise<string> {
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

        const response = await fetch(url, options);
        return await response.text();
    }

    async poligonRequest(task: string, answer: any): Promise<string> {
        const payload = {
            task,
            apikey: process.env.POLIGON_API_KEY,
            answer
        };

        return await this.makeRequest(
            `${process.env.CENTRALA_URL}/verify`,
            JSON.stringify(payload)
        );
    }

    // Function to get answer from LLM
    async getAnswerFromLLM(
        question: string,
        context: string,
        options: {
            model?: string;
            temperature?: number;
        } = {}
    ): Promise<string | { thoughts: string; answer: string }> {
        const response: LLMResponse = await this.openai.chat.completions.create({
            model: options.model ?? "gpt-4o",
            messages: [
                { role: "system", content: context },
                { role: "user", content: question }
            ],
            temperature: options.temperature ?? 0.7
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No response content received from LLM');
        }

        // Try to parse as JSON, if it fails return as string
        try {
            return JSON.parse(content).trim();
        } catch {
            return content.trim();
        }
    }
}

export default Utils;
