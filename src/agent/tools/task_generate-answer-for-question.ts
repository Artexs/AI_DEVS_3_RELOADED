import { Utils, Logger, OpenAIService, MessageManager, LangfuseService, DatabaseService } from '../../index';
import { IDoc } from '../../types/types';
import { document } from '../metadata';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadAnswers, updateAnswers, type AnswersFile } from './task_contact-centrala';
import { systemPromptNotatkiRafala } from '../../../data/S04/E05/prompts/systemPromptNotatkiRafala';
import { databaseInstruction } from '../prompts/toolsInstructions/database';
import type { MessageArray } from '../../index';

// Async function to get context for a given question using LLM keyword extraction and DB lookup
async function getContextForQuestionAsync_old(currentQuestion: string): Promise<string> {
    try {
        // 1. Prepare LLM prompt for keyword extraction
        const openAIService = new OpenAIService();
        const messages: MessageArray = [
            { role: 'system', content: databaseInstruction },
            { role: 'user', content: currentQuestion }
        ];
        // 2. Call LLM to extract keywords (expects { keywords: [...] })
        const result = await openAIService.processTextAsJson(messages, '4o', 0.2);
        if (!result.keywords || !Array.isArray(result.keywords) || result.keywords.length === 0) {
            throw new Error(`No keywords extracted for question '${currentQuestion}'. LLM result: ${JSON.stringify(result)}`);
        }
        // 3. Query DB for documents by keywords
        const dbService = new DatabaseService();
        const docs = await dbService.getDocumentsByKeywords(result.keywords);
        // if (!docs || docs.length === 0) {
        //     throw new Error(`No documents found for keywords: ${result.keywords.join(', ')}`);
        // }
        // 4. Return concatenated docs as context
        return docs.join('\n\n---\n\n');
    } catch (error) {
        throw new Error(`Failed to load context for question '${currentQuestion}' using LLM+DB: ${error}`);
    }
}

async function getContextForQuestionAsync(currentQuestion: string): Promise<string> {
  const dbService = new DatabaseService();
  const openAIService = new OpenAIService();
  const instruction = `You are an expert assistant. Analyze the user's question and the attached document. If the document contains any valuable information that can help answer the question, respond with json object { \"_thinking\": \"your reasoning\", \"result\": true }. Otherwise, respond with { \"_thinking\": \"your reasoning\", \"result\": false }.`;

  const allDocs = await dbService.getAllDocumentsText();

  const results = await Promise.all(
    allDocs.map(async (doc) => {
        const systemPrompt = `${instruction}\n\n<document>\n${doc}\n</document>`;
        const messages: MessageArray = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: currentQuestion }
        ];
        const result = await openAIService.processTextAsJson(messages, 'mini', 0.2);
        if (result && typeof result.result === 'boolean' && result.result === true) {
            return doc;
        }
        return null;
    })
  );
  console.log(`    number of documents retrieved from database: ${results.length} ------`)

  const relevantDocs = results.filter(Boolean) as string[];
  return relevantDocs.join('\n\n---\n\n');
}

export class GenerateAnswerForQuestionTool {
    private readonly utils: Utils;
    private readonly logger: Logger;
    private readonly openAIService: OpenAIService;
    private readonly langfuseService: LangfuseService;

    constructor(logger: Logger, langfuseService: LangfuseService) {
        this.utils = new Utils();
        this.logger = logger;
        this.openAIService = new OpenAIService();
        this.langfuseService = langfuseService;
    }

    private async LlmRequest(
        context: string, 
        responseFromCentrala: string, 
        question: string,
        questionNumber: number
    ): Promise<{ _thinking: string; answer: string }> {
        // Prepare system prompt with context and last response from centrala
        let systemPrompt = systemPromptNotatkiRafala(context, responseFromCentrala);

        // Prepare user prompt with the question
        const userPrompt = `Question ${questionNumber}: ${question}`;
        await this.logger.log(`GENERATE_ANSWER_FOR_QUESTION_TOOL --- right before llm call`);

        // Call LLM through LangfuseService
        const llmResponse = await this.langfuseService.llmRequestAsJson(
            `Generate answer for question ${questionNumber}`,
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            '41',
            0.2
        );

        await this.logger.log(`GENERATE_ANSWER_FOR_QUESTION_TOOL --- LLM response: ${JSON.stringify(llmResponse)}`);

        // Ensure the response has the expected structure
        if (typeof llmResponse !== 'object' || !llmResponse._thinking || !llmResponse.answer) {
            throw new Error(`Invalid LLM response format. Expected { _thinking: string, answer: string }, got: ${JSON.stringify(llmResponse)}`);
        }

        return {
            _thinking: llmResponse._thinking as string,
            answer: llmResponse.answer as string
        };
    }

    async generateAnswerForQuestion(parameters: Record<string, any>, conversation_uuid: string): Promise<IDoc> {
        const { questionsfromcentrala, lastresponsefromcentrala } = parameters;
        await this.logger.log(`GENERATE_ANSWER_FOR_QUESTION_TOOL --- params: ${JSON.stringify(parameters)}`);

        if (!questionsfromcentrala) {
            return document(`Missing required parameter: questionsfromcentrala is required, current parameters: ${parameters}`, 'gpt-4o', {
                name: 'error',
                description: 'Parameter validation error',
                source: 'GenerateAnswerForQuestionTool',
                content_type: 'error',
                conversation_uuid,
            });
        }

        // Load answers from contact-centrala
        const answersData: AnswersFile = await loadAnswers();
        await this.logger.log(`GENERATE_ANSWER_FOR_QUESTION_TOOL --- Loaded answers data: ${JSON.stringify(answersData)}`);

        const responsefromcentrala = answersData.centralaResponse;
        // Get current question number
        const currentQuestionNumber = answersData.questionNumber;
        await this.logger.log(`GENERATE_ANSWER_FOR_QUESTION_TOOL --- Current question number: ${currentQuestionNumber}`);

        // Load questions from questions.json
        const questionsFilePath = join(__dirname, '../../../data/S05/E05/story.json');
        if (!existsSync(questionsFilePath)) {
            return document(`Questions file does not exist: ${questionsFilePath}`, 'gpt-4o', {
                name: 'questions.json',
                description: 'Questions file not found error',
                source: questionsFilePath,
                content_type: 'error',
                conversation_uuid,
            });
        }

        const questionsData = JSON.parse(readFileSync(questionsFilePath, 'utf-8'));
        const currentQuestion = questionsData[String(currentQuestionNumber).padStart(2, '0')];
        await this.logger.log(`GENERATE_ANSWER_FOR_QUESTION_TOOL --- Current question: ${currentQuestion}`);

        // Read the context file
        const contextFilePath = join(__dirname, '../../../data/agent/notatki_rafala.txt');
        
        if (!existsSync(contextFilePath)) {
            return document(`Context file does not exist: ${contextFilePath}`, 'gpt-4o', {
                name: 'notatki_rafala.txt',
                description: 'Context file not found error',
                source: contextFilePath,
                content_type: 'error',
                conversation_uuid,
            });
        }

        // const contextContent = readFileSync(contextFilePath, 'utf-8');
        const contextContent = await getContextForQuestionAsync(currentQuestion);
        await this.logger.log(`GENERATE_ANSWER_FOR_QUESTION_TOOL --- Context content loaded from: ${contextFilePath}`);

        // Generate answer using LLM
        const llmResponse = await this.LlmRequest(
            contextContent,
            responsefromcentrala,
            currentQuestion,
            currentQuestionNumber
        );

        console.log("ANSWER -+_+_+_+_+_ -- ", llmResponse)
        // Extract answer from LLM response
        const answer = llmResponse.answer;
        if (!answer) {
            return document(`LLM response missing answer field: ${JSON.stringify(llmResponse)}`, 'gpt-4o', {
                name: 'llm_error',
                description: 'LLM response format error',
                source: 'GenerateAnswerForQuestionTool',
                content_type: 'error',
                conversation_uuid,
            });
        }

        // Update answers with the new answer
        const questionKey = String(currentQuestionNumber).padStart(2, '0') as keyof typeof answersData.answers;
        answersData.answers[questionKey] = answer;

        // Save updated answers
        await updateAnswers(answersData);
        await this.logger.log(`GENERATE_ANSWER_FOR_QUESTION_TOOL --- Updated answers saved`);

        // Console log the answer
        console.log(`Answer for question ${currentQuestionNumber}: ${answer}`);

        return document(answer, 'gpt-4o', {
            name: `answer_question_${currentQuestionNumber}`,
            description: `Generated answer for question ${currentQuestionNumber}: ${currentQuestion}`,
            source: contextFilePath,
            content_type: 'complete',
            conversation_uuid,
        });
    }
} 