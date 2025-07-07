import { Utils, Logger, OpenAIService, MessageManager, LangfuseService } from '../../index';
import { IDoc } from '../../types/types';
import { document } from '../metadata';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadAnswers, updateAnswers, type AnswersFile } from './contact-centrala';

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
        responseFromCentrala: string | undefined, 
        question: string,
        questionNumber: number
    ): Promise<{ _thinking: string; answer: string }> {
        // Prepare system prompt with context and last response from centrala
        let systemPrompt = context;
        if (responseFromCentrala) {
            systemPrompt += `
            ----------
            Last response from centrala: 
            ${responseFromCentrala}
            `;
        }

        // Prepare user prompt with the question
        const userPrompt = `Question ${questionNumber}: ${question}`;

        // Call LLM through LangfuseService
        const llmResponse = await this.langfuseService.llmRequestAsJson(
            `Generate answer for question ${questionNumber}`,
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            '4o'
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

        // Get current question number
        const currentQuestionNumber = answersData.questionNumber;
        await this.logger.log(`GENERATE_ANSWER_FOR_QUESTION_TOOL --- Current question number: ${currentQuestionNumber}`);

        // Load questions from questions.json
        const questionsFilePath = join(__dirname, '../../../data/S04/E05/questions.json');
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

        const contextContent = readFileSync(contextFilePath, 'utf-8');
        await this.logger.log(`GENERATE_ANSWER_FOR_QUESTION_TOOL --- Context content loaded from: ${contextFilePath}`);

        // Generate answer using LLM
        const llmResponse = await this.LlmRequest(
            contextContent,
            lastresponsefromcentrala,
            currentQuestion,
            currentQuestionNumber
        );

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