import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { LangfuseService, Utils, OpenAIService } from '../index';

export class FileLoader {
    private readonly baseDir: string;
    private readonly langfuseService: LangfuseService;
    private readonly utils: Utils;
    private readonly openAIService: OpenAIService;

    constructor() {
        this.baseDir = process.cwd();
        this.langfuseService = new LangfuseService();
        this.utils = new Utils();
        this.openAIService = new OpenAIService();
    }

    private async extractKeywords(text: string): Promise<string[]> {
        const systemPrompt = `Analyze the following text and extract ALL relevant keywords that are associated with the content. 
Return ONLY the keywords in Polish language, separated by commas. 
Focus on extracting meaningful terms, concepts, and important entities.
Do not include any explanations or additional text, just the keywords.`;

        try {
            const response = await this.openAIService.processText(text, systemPrompt, { model: "gpt-4o" });
            return response.split(',').map(keyword => keyword.trim());
        } catch (error) {
            console.error('Error extracting keywords:', error);
            return [];
        }
    }

    async loadFacts2(): Promise<string> {
        const factsDir = join(this.baseDir, 'data', 'pliki_z_fabryki', 'facts');
        const files = await readdir(factsDir);
        
        const factContents = await Promise.all(
            files
                .filter(file => file.endsWith('.txt'))
                .map(async file => {
                    const content = await readFile(join(factsDir, file), 'utf-8');
                    const keywords = await this.extractKeywords(content);
                    
                    // Save keywords to JSON file
                    const jsonPath = join(factsDir, file.replace('.txt', '.json'));
                    await writeFile(jsonPath, JSON.stringify({ keywords }, null, 2));
                    
                    return keywords;
                })
        );
        
        return factContents.join('\n\n-----------\n\n');
    }

    async loadFacts(): Promise<string> {
        const factsDir = join(this.baseDir, 'data', 'pliki_z_fabryki', 'facts');
        const files = await readdir(factsDir);
        
        const factContents = await Promise.all(
            files
                .filter(file => file.endsWith('.json'))
                .map(async file => {
                    const content = await readFile(join(factsDir, file), 'utf-8');
                    const { keywords } = JSON.parse(content);
                    return keywords;
                })
        );
        
        return factContents.join('\n\n-----------\n\n');
    }

    async processFile(file: string, facts: string): Promise<any> {
        console.log(`Processing file: ${file}`);
        const content = await readFile(join(this.baseDir, 'data', 'pliki_z_fabryki', file), 'utf-8');

        const userMessage = `
<facts>
${facts}
</facts>

<reportToAnalyze>
report name: '${file}'
report content: ${content.trim()}
</reportToAnalyze>
`;

        try {
            const response = await this.langfuseService.processPrompt(
                's03e01_analize_report',
                userMessage,
                { model: "gpt-4o" }
            );
            console.log("typeof string ", typeof(response))
            // console.log(typeof(parsed))
            console.log("response: ", response)
            console.log('')
            const parsed = JSON.parse(response);
            return {
                file,
                answer: parsed.answer
            };
        } catch (error) {
            console.error(`Error processing file ${file}:`, error);
            return {
                file,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async testAllTxtFiles(): Promise<void> {
        const factoryDir = join(this.baseDir, 'data', 'pliki_z_fabryki');
        const files = await readdir(factoryDir);
        const txtFiles = files.filter(file => file.endsWith('.txt'));
        
        const facts = await this.loadFacts();
        console.log("facts", facts)
        const responses = [];

        for (const file of txtFiles) {
            const response = await this.processFile(file, facts);
            responses.push(response);
        }

        const formattedResponse = {
            task: "dokumenty",
            apikey: process.env.POLIGON_API_KEY,
            answer: responses.reduce((acc, { file, answer }) => {
                if (answer) {
                    acc[file] = answer;
                }
                return acc;
            }, {} as Record<string, string>)
        };

        console.log('Sending response to centrala:', JSON.stringify(formattedResponse, null, 2));
        const result = await this.utils.sendToCentrala('dokumenty', formattedResponse.answer);
        console.log('Centrala response:', result);
    }
}

// Self-executing function to run testAllTxtFiles
(async () => {
    const loader = new FileLoader();
    await loader.testAllTxtFiles();
})().catch(console.error);