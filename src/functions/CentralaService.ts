import 'dotenv/config';
import { OpenAI } from 'openai';
import { promises as fs } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';

const STATE_FILE_PATH = join(process.cwd(), 'data/agent/centrala_state_temp.json');

interface CentralaState {
    questions: Record<string, string>;
    answers: Record<string, string>;
    questionNumber: string;
    centralaHint: string;
    taskName: string;
}

export class Centrala {
    private state: CentralaState | null = null;

    private readonly config = {
        openaiApiKey: process.env.OPENAI_API_KEY ?? '',
        firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? '',
        centralaUrl: process.env.CENTRALA_URL ?? '',
        poligonApiKey: process.env.POLIGON_API_KEY ?? '',
    };

    // Initialization logic for stateful Q&A
    public async initState(filename: string, fileLocation: string, taskName: string, cleanInit: boolean = false): Promise<void> {
        // console.log("STATE_FILE_PATH: ", STATE_FILE_PATH)
        try {
            if (!cleanInit && existsSync(STATE_FILE_PATH)) {
                const file = await fs.readFile(STATE_FILE_PATH, 'utf-8');
                this.state = JSON.parse(file);
                // Validate loaded state
                if (!this.state?.questions || !this.state.answers || !this.state.questionNumber || !this.state.taskName) {
                    throw new Error('State file corrupted');
                }
            } else {
                // Load questions using getFileFromCentrala
                let questions: Record<string, string> | string = await this.getFileFromCentrala(filename, fileLocation);
                if (typeof questions === 'string') {
                    try {
                        questions = JSON.parse(questions);
                    } catch (err) {
                        console.error('Failed to parse questions string:', err);
                        throw err;
                    }
                }
                // At this point, questions should be an object
                if (typeof questions !== 'object' || questions === null) {
                    throw new Error('Questions is not a valid object');
                }
                const questionsObj = questions as Record<string, string>;
                console.log("questions: ", questionsObj)

                const answers: Record<string, string> = {};
                Object.keys(questionsObj).forEach(key => { answers[key] = 'placeholder'; });
                const firstQuestion = Object.keys(questionsObj)[0];
                this.state = {
                    questions: questionsObj,
                    answers,
                    questionNumber: firstQuestion,
                    centralaHint: '',
                    taskName
                };
                await this.saveState();
            }
        } catch (err) {
            console.error('Failed to initialize state:', err);
            throw err;
        }
        // console.log("this.state: ", this.state)
    }

    private async saveState() {
        if (!this.state) return;
        try {
            await fs.writeFile(STATE_FILE_PATH, JSON.stringify(this.state, null, 2), 'utf-8');
        } catch (err) {
            console.error('Failed to save state:', err);
        }
    }

    public getCurrentQuestionInfo() {
        if (!this.state) {
            throw new Error('State not initialized');
        }
        const state = this.state as CentralaState;
        return {
            questionNumber: state.questionNumber,
            question: state.questions && state.questionNumber in state.questions ? state.questions[state.questionNumber] : '',
            centralaHint: state.centralaHint
        };
    }

    public async submitAnswer(answer: string): Promise<string | undefined> {
        if (!this.state) throw new Error('State not initialized');
        const { questionNumber, answers, taskName } = this.state;
        answers[questionNumber] = answer;
        const ans = JSON.stringify(answers);
        const ansObj = JSON.parse(ans)
        const centralaResponseRaw = await this.sendToCentralaGlobal(taskName, { answer: ansObj }, 'report');
        console.log("centralaResponseRaw: ", centralaResponseRaw)
        return this.checkCentralaResponse(centralaResponseRaw);
    }

    private async checkCentralaResponse(response: any): Promise<string | undefined> {
        let parsedResponse = response;
        if (typeof response === 'string') {
            console.log('checkCentralaResponse - received string response:', response);
            try {
                parsedResponse = JSON.parse(response);
            } catch (err) {
                console.error('Failed to parse response string in checkCentralaResponse:', err);
                return undefined;
            }
        }
        if (parsedResponse && parsedResponse.code === 200) return parsedResponse.message || 'Message should be here';
        console.log('parsedResponse?.hint: ', response)
        this.state.centralaHint = parsedResponse?.hint || '';

        // Extract any number from the message (e.g., "question 01" or "question 1")
        const match = parsedResponse?.message.match(/question\s*(\d+)/i);
        let extractedNumber = match ? match[1] : undefined;
        if (extractedNumber && extractedNumber.length === 1) {
            extractedNumber = '0' + extractedNumber;
        }
        // console.log('checkCentralaResponse - regex match for question number: ', JSON.stringify(match))
        // console.log('checkCentralaResponse - final question number: ', extractedNumber)
        // console.log('checkCentralaResponse - this.state.questionNumber: ', this.state!.questionNumber)

        if (extractedNumber && extractedNumber !== this.state!.questionNumber) {
            this.state!.questionNumber = extractedNumber;
        }
        await this.saveState();
        
        return undefined;
    }

    private async makeRequest(url: string, data?: object): Promise<string> {
        // console.log(`TEST TEST TEST 123 ${url}, ${JSON.stringify(data)} `)
        const response = await fetch(url, {
            method: data ? 'POST' : 'GET',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            ...(data && { body: JSON.stringify(data) })
        });

        // if (!response.ok) 
        // {
        //     console.error(`Request failed: ${url}`)
        //     console.error(data);
        //     console.error(response);
        //     // throw new Error();
        // }
        
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

    async getFileFromCentrala(filename: string, fileLocation: string, forceRefresh?: boolean): Promise<any> {
        const dataDir = join(process.cwd(), fileLocation);
        const dataFile = join(dataDir, filename);

        // Create directory if it doesn't exist
        if (!existsSync(dataDir)) {
            await fs.mkdir(dataDir, { recursive: true });
        }

        // If not forcing refresh, try to load from file first
        if (!forceRefresh && existsSync(dataFile)) {
            try {
                const data = await fs.readFile(dataFile, 'utf-8');
                return JSON.parse(data);
            } catch (error) {
                console.error('Failed to load data from file:', error);
            }
        }

        // If file doesn't exist, loading failed, or forceRefresh is true, fetch from Centrala
        try {
            console.log(`Fetching from Centrala... ${filename}`)
            const apiKey = this.config.poligonApiKey;
            if (!apiKey) {
                throw new Error('API key not found in environment variables');
            }

            const url = `https://c3ntrala.ag3nts.org/data/${apiKey}/${filename}`;
            console.log(`Downloading from... ${url}`)
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.statusText}`);
            }

            const data = await response.text();
            // Save to file
            await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
            console.log(`Downloaded and saved: ${dataFile}`)
            return data;
        } catch (error) {
            console.error('Failed to fetch data from Centrala:', error);
            throw error;
        }
    }
}
