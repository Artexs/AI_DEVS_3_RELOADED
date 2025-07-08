import { join } from 'path';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { PdfProcessor, Logger, Utils, ImageProcessor, OpenAIService, MessageManager } from '../index';
import { systemPromptNotatkiRafala } from '../../data/S04/E05/prompts/systemPromptNotatkiRafala';
import { v4 as uuidv4 } from 'uuid';
import { GenerateAnswerForQuestionTool } from '../agent/tools/task_generate-answer-for-question';
import { LangfuseService } from '../index';
import { updateAnswers, loadAnswers, ContactCentralaTool } from '../agent/tools/task_contact-centrala';

const logger = new Logger('S04E05');
const centralaTool = new ContactCentralaTool(logger);
const langfuse = new LangfuseService();

async function sendAnswersToCentrala(logger: Logger, conversation_uuid: string) {
    const latestAnswers = await loadAnswers();
    const response = await centralaTool.sendAnswer({
        task: 'notes',
        paramName: 'answer',
        response: latestAnswers.answers,
        url: 'verify'
    }, conversation_uuid);

    // Extract message and hint
    const { message, hint } = JSON.parse(response.text);
// console.log(JSON.stringify(JSON.parse(response.text), null, 2))
    
    const match = message && message.match(/\d+/);
    const extractedNumber = match ? parseInt(match[0], 10) : null;

    if(extractedNumber === null) {
        throw new Error(`Extracted number is null, message: ${message}, extractedNumber: ${extractedNumber}, response: ${JSON.stringify(response.text, null, 2)}`);
    }

    if (extractedNumber === latestAnswers.questionNumber) {
        latestAnswers.centralaResponse = hint;
    } else {
        latestAnswers.questionNumber = extractedNumber;
    }
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
    for (let i = 0; i < 5; i++) {
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

// Add proper async handling for the main function
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});