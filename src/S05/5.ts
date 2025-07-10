import { join } from 'path';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { PdfProcessor, Logger, Utils, ImageProcessor, OpenAIService, MessageManager } from '../index';
import { systemPromptNotatkiRafala } from '../../data/S04/E05/prompts/systemPromptNotatkiRafala';
import { v4 as uuidv4 } from 'uuid';
import { GenerateAnswerForQuestionTool } from '../agent/tools/task_generate-answer-for-question';
import { LangfuseService } from '../index';
import { updateAnswers, loadAnswers, ContactCentralaTool } from '../agent/tools/task_contact-centrala';

function answersObjectToArray(answersObj: Record<string, string>): string[] {
    if (!answersObj || typeof answersObj !== 'object') return [];
    return Object.keys(answersObj)
        .sort((a, b) => Number(a) - Number(b))
        .map(key => answersObj[key] ?? '');
}

const logger = new Logger('S04E05');
const centralaTool = new ContactCentralaTool(logger);
const langfuse = new LangfuseService();

async function sendAnswersToCentrala(logger: Logger, conversation_uuid: string) {
    const latestAnswers = await loadAnswers();
    const answersArray = answersObjectToArray(latestAnswers.answers);
    // console.log(answersArray)
    const response = await centralaTool.sendAnswer({
        task: 'story',
        paramName: 'answer',
        response: answersArray,
        url: 'verify'
    }, conversation_uuid);

    // Extract message and hint
    const { message, hint, failed } = JSON.parse(response.text);
    console.log(JSON.stringify(JSON.parse(response.text), null, 2))
    
    if (!failed) {
        throw new Error(response.text);
    }

    // failed is an array, get the first string
    const firstFailed = failed[0];
    // extract the number from 'index[1] = ...'
    const match = firstFailed && firstFailed.match(/index\[(\d+)\]/);
    latestAnswers.questionNumber = parseInt(match[1], 10)+1;
    await updateAnswers(latestAnswers);
    
    return response;
}

async function main() {
    // Read questions-answers-temp.json
    const answersPath = join(__dirname, '../../data/agent/questions-answers-temp.json');
    const answers = JSON.parse(readFileSync(answersPath, 'utf-8'));

    // Generate random UUID
    const conversation_uuid = uuidv4();
    const currentDate = new Date().toISOString().split('T')[0];

    // Instantiate tool with dummy logger/langfuse
    await langfuse.generateTrace(`s04e05---${currentDate}`, conversation_uuid);
    const tool = new GenerateAnswerForQuestionTool(logger, langfuse);

    // Run the process 10 times
    let lastResult = null;
    for (let i = 0; i < 1; i++) {
        console.log(`--- Iteration ${i + 1} ---`);
        
        // Call generateAnswerForQuestion
        const result = await tool.generateAnswerForQuestion({
            questionsfromcentrala: {},
            lastresponsefromcentrala: answers
        }, conversation_uuid);

        // console.log('Result:', result);
        console.log('Result:', result.text);

        // Load latest answers and send to centrala
        const centralaResponse = await sendAnswersToCentrala(logger, conversation_uuid);
        console.log('Centrala response:', centralaResponse.text);
        
        lastResult = result;
    }

    if (lastResult) {
        await langfuse.finalizeTrace([{ role: "assistant", content: lastResult.text }]);
    }
}

sendAnswersToCentrala(logger, 'uuid').catch();
// main().catch();