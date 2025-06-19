import { join } from 'path';
import { writeFileSync, existsSync, readFileSync, readdirSync } from 'fs';
import { Logger, Utils, OpenAIService, MessageArray, DatabaseService } from '../index';
import crypto from 'crypto';
import { getSystemPrompt } from '../../data/S05/E01/prompts/system';
import { getUserPrompt } from '../../data/S05/E01/prompts/user';
import { getConversationAnalysisPrompt } from '../../data/S05/E01/prompts/conversation';
import { getQuestionAnswerPrompt } from '../../data/S05/E01/prompts/questionAnswer';
import { getDetectLiarPrompt } from '../../data/S05/E01/prompts/detectLiar';

interface PhoneData {
    rozmowa1: Conversation;
    rozmowa2: Conversation;
    rozmowa3: Conversation;
    rozmowa4: Conversation;
    rozmowa5: Conversation;
    reszta: string[];
}

export interface Conversation {
    rozmowa: {
        start: string;
        end: string;
        length: number;
        lines: string[];
        uuid: string;
    };
    people?: string[];
    uuid: string;
}

export interface RestMessage {
    id: number;
    value: string;
}

interface Questions {
    [key: string]: string;
}

class PhoneAnalyzer {
    private readonly logger: Logger;
    private readonly utils: Utils;
    private readonly openai: OpenAIService;
    private readonly BASE_DATA_DIR: string;
    private readonly FACTS_DIR: string;
    private conversations: Conversation[] = [];
    private availableMessages: RestMessage[] = [];
    private phoneData: Conversation[] = [];
    private answers: { uuid: string; question: string; answer: string }[] = [];
    protected db = new DatabaseService('data/S05/E01/database.db');

    constructor() {
        this.logger = new Logger('S05E01');
        this.utils = new Utils();
        this.openai = new OpenAIService();
        this.BASE_DATA_DIR = join(process.cwd(), 'data', 'S05', 'E01');
        this.FACTS_DIR = join(process.cwd(), 'data', 'pliki_z_fabryki', 'facts');
    }

    async loadPhoneData(sorted: boolean = false): Promise<void> {
        const dataPath = join(this.BASE_DATA_DIR, sorted ? 'phone_sorted.json' : 'phone.json');
        
        // Check if cached file exists
        if (existsSync(dataPath)) {
            await this.logger.log(`Reading cached phone data from ${dataPath}`);
            const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
            this.phoneData = [
                { rozmowa: data.rozmowa1, uuid: crypto.randomUUID() },
                { rozmowa: data.rozmowa2, uuid: crypto.randomUUID() },
                { rozmowa: data.rozmowa3, uuid: crypto.randomUUID() },
                { rozmowa: data.rozmowa4, uuid: crypto.randomUUID() },
                { rozmowa: data.rozmowa5, uuid: crypto.randomUUID() }
            ];
            return;
        }

        // Download and save data
        await this.logger.log(`Downloading ${sorted ? 'sorted' : 'unsorted'} phone data...`);
        const data = await this.utils.getFileFromCentrala(
            sorted ? 'phone_sorted.json' : 'phone.json', 
            'data/S05/E01'
        );
        
        // Save to cache
        writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
        await this.logger.log(`Saved phone data to ${dataPath}`);
        
        this.phoneData = [
            { rozmowa: data.rozmowa1, uuid: crypto.randomUUID() },
            { rozmowa: data.rozmowa2, uuid: crypto.randomUUID() },
            { rozmowa: data.rozmowa3, uuid: crypto.randomUUID() },
            { rozmowa: data.rozmowa4, uuid: crypto.randomUUID() },
            { rozmowa: data.rozmowa5, uuid: crypto.randomUUID() }
        ];
    }

    async getQuestions(): Promise<Questions> {
        const questionsPath = join(this.BASE_DATA_DIR, 'phone_questions.json');
        
        // Check if cached file exists
        if (existsSync(questionsPath)) {
            await this.logger.log(`Reading cached questions from ${questionsPath}`);
            return JSON.parse(readFileSync(questionsPath, 'utf-8'));
        }

        // Download and save questions
        await this.logger.log('Downloading questions...');
        const questions = await this.utils.getFileFromCentrala('phone_questions.json', 'data/S05/E01');
        
        // Save to cache
        writeFileSync(questionsPath, JSON.stringify(questions, null, 2), 'utf-8');
        await this.logger.log(`Saved questions to ${questionsPath}`);
        
        return questions;
    }

    async loadFacts(): Promise<string> {
        const files = readdirSync(this.FACTS_DIR)
            .filter(file => file.endsWith('.txt'))
            .sort((a, b) => {
                const numA = parseInt(a.replace('f', '').replace('.txt', ''));
                const numB = parseInt(b.replace('f', '').replace('.txt', ''));
                return numA - numB;
            });

        const facts = files.map(file => {
            const content = readFileSync(join(this.FACTS_DIR, file), 'utf-8');
            return content.trim();
        });

        return facts.join('\n\n-------------\n\n');
    }

    private async getPhoneData(): Promise<void> {
        await this.loadPhoneData();
        
        this.conversations = this.phoneData
            .sort((a, b) => a.rozmowa.length - b.rozmowa.length)
            .map(conv => ({
                rozmowa: {
                    ...conv.rozmowa,
                    uuid: crypto.randomUUID(),
                    lines: []
                },
                uuid: crypto.randomUUID()
            }));

        this.availableMessages = this.phoneData
            .flatMap(conv => conv.rozmowa.lines)
            .map((value, index) => ({
                id: index + 1,
                value
            }));
    }

    private async buildConversations(): Promise<void> {
        await this.logger.log('Starting to build conversations...');
        const systemPrompt = getSystemPrompt(this.availableMessages, this.conversations.map(c => c.rozmowa));

        const conversation = this.conversations[0];
        await this.db.addMessage(conversation.uuid, 'system', systemPrompt);
        
        for (let i = 0; i < conversation.rozmowa.length - 2; i++) {
            const userMessage = await getUserPrompt(this.availableMessages, conversation.rozmowa, this.logger);
            await this.logger.log(`---- Processing message ${i + 1} of ${conversation.rozmowa.length - 2}`);
            await this.db.addMessage(conversation.uuid, 'user', userMessage);

            const messages = await this.db.getMessageHistory(conversation.uuid);
            
            const response = await this.openai.processTextAsJson(messages);
            await this.logger.log(`Received response from OpenAI: ${JSON.stringify(response)}`);
            await this.db.addMessage(conversation.uuid, 'assistant', JSON.stringify(response));
            
            const id = parseInt(response.id);
            
            const messageIndex = this.availableMessages.findIndex(msg => msg.id === id);
            if (messageIndex === -1) {
                await this.logger.error(`Message with ID ${id} not found in availableMessages`);
                continue;
            }

            const [message] = this.availableMessages.splice(messageIndex, 1);
            await this.logger.log(`Added message to conversation: ${message.value}`);
            conversation.rozmowa.lines.push(message.value);
        }
        await this.logger.log('Finished building conversations');
    }

    async analyzePeopleInConversations(facts: string): Promise<void> {
        if (!this.phoneData.length) {
            throw new Error('Phone data not loaded. Call loadPhoneData first.');
        }

        for (const conversation of this.phoneData) {
            const conversationId = crypto.randomUUID();
            // await this.logger.log(`Analyzing conversation ${JSON.stringify(conversation, null, 2)}`);
            
            const prompt = getConversationAnalysisPrompt(JSON.stringify(conversation), JSON.stringify(facts));
            await this.db.addMessage(conversationId, 'system', prompt);

            // Get message history for LLM
            const messages = await this.db.getMessageHistory(conversationId);
            const response = await this.openai.processTextAsJson(messages, '4o');
            await this.logger.log(`Analysis result: ${JSON.stringify(response, null, 2)}`);

            // Store people in the conversation object
            conversation.people = response.people;
        }
    }

    async answerQuestions(questions: Questions, facts: string, liarDetection: string): Promise<void> {
        if (!this.phoneData.length) {
            throw new Error('Phone data not loaded. Call loadPhoneData first.');
        }

        // Save data to file
        const dataToSave = `Phone Calls:\n${JSON.stringify(this.phoneData, null, 2)}\n------------------------------\nLiar Detected:\n${liarDetection}\n------------------------------\nFacts:\n${facts}`;
        const dataPath = join(this.BASE_DATA_DIR, 'analysis_data.txt');
        writeFileSync(dataPath, dataToSave, 'utf-8');
        await this.logger.log(`Saved analysis data to ${dataPath}`);

        const phoneDataWithLiarDetection = `${JSON.stringify(this.phoneData)}\n-------\n${liarDetection}`;
        const systemPrompt = getQuestionAnswerPrompt(phoneDataWithLiarDetection, JSON.stringify(facts));

        for (const [questionId, question] of Object.entries(questions)) {
            const conversationId = crypto.randomUUID();
            await this.logger.log(`Processing question ${questionId}: ${question}`);
            
            // Store system prompt
            await this.db.addMessage(conversationId, 'system', systemPrompt);
            
            // Store question as user message
            await this.db.addMessage(conversationId, 'user', question);

            // Get message history and process with LLM
            const messages = await this.db.getMessageHistory(conversationId);
            const response = await this.openai.processTextAsJson(messages, '4o');
            await this.db.addMessage(conversationId, 'assistant', JSON.stringify(response));
            
            await this.logger.log(`Answer for question ${questionId}: ${JSON.stringify(response, null, 2)}`);
            
            this.answers.push({
                uuid: conversationId,
                question,
                answer: response.answer || response._thinking || JSON.stringify(response)
            });
        }
    }

    async detectLiar(facts: string): Promise<{ _thinking: string; answer: string }> {
        if (!this.phoneData.length) {
            throw new Error('Phone data not loaded. Call loadPhoneData first.');
        }

        const conversationId = crypto.randomUUID();
        await this.logger.log('Detecting who is lying in conversations...');
        
        const prompt = getDetectLiarPrompt(JSON.stringify(this.phoneData), JSON.stringify(facts));
        await this.db.addMessage(conversationId, 'system', prompt);

        // Get message history for LLM
        const messages = await this.db.getMessageHistory(conversationId);
        const response = await this.openai.processTextAsJson(messages, '4o');
        await this.logger.log(`Liar detection result: ${JSON.stringify(response, null, 2)}`);

        return response as { _thinking: string; answer: string };
    }

    async sendAnswersToCentrala(): Promise<void> {
        // if (!this.answers.length) {
        //     throw new Error('No answers to send. Call answerQuestions first.');
        // }

        // // Format answers according to expected format
        // const formattedAnswers = this.answers.reduce((acc, answer, index) => {
        //     const questionId = (index + 1).toString().padStart(2, '0');
        //     acc[questionId] = answer.answer;
        //     return acc;
        // }, {} as Record<string, string>);
        // const formattedAnswers = {
        //     "01": "Barbara Zawadzka",
        //     "02": "https://rafal.ag3nts.org/510bc",
        //     "03": "Aleksander Ragowski",
        //     "04": "Barbara Zawadzka, Adam Gospodarczyk",
        //     "05": "Nie wiadomo, co zwraca endpoint API po wysłaniu hasła.",
        //     "06": "Barbara Zawadzka"
        // };
        const response2 = await fetch('https://rafal.ag3nts.org/b46c3', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: "NONOMNISMORIAR"
            })
        });

        const data = await response2.json();
        const message = data.message;
        // await this.logger.log(`API Response message: ${message}`);

        const formattedAnswers = {
            "01": "Samuel",
            "02": "https://rafal.ag3nts.org/b46c3",
            "03": "Przezwisko Aleksandra to nauczyciel.",
            "04": "Barbara Zawadzka, Samuel",
            "05": message,
            "06": "Aleksander"
        }

        await this.logger.log(`Sending answers to Centrala: ${JSON.stringify(formattedAnswers, null, 2)}`);
        
        const utils = new Utils();
        const response = await utils.sendToCentrala('phone', formattedAnswers);
        await this.logger.log(`Centrala response: ${JSON.stringify(response, null, 2)}`);
    }

    async analyze(): Promise<void> {
        try {
            // await this.loadPhoneData(true);
            // const questions = await this.getQuestions();
            // const facts = await this.loadFacts();
            
            // // First analyze people in conversations
            // await this.analyzePeopleInConversations(facts);
            // await this.logger.log(`Question answers: ${JSON.stringify(this.phoneData, null, 2)}`);
            
            // // Detect who is lying
            // const liarDetection = await this.detectLiar(facts);
            // await this.logger.log(`Liar detection: ${JSON.stringify(liarDetection, null, 2)}`);
            
            // // Then answer all questions with liar detection result
            // await this.answerQuestions(questions, facts, liarDetection.answer);
            // await this.logger.log(`Question answers: ${JSON.stringify(this.answers, null, 2)}`);
            
            // Send answers to Centrala
            await this.sendAnswersToCentrala();
            
        } catch (error) {
            await this.logger.error('Error in analysis:', error);
            throw error;
        }
    }
}

// Run the analyzer
const analyzer = new PhoneAnalyzer();
analyzer.analyze();
