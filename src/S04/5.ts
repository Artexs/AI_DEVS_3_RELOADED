import { join } from 'path';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { PdfProcessor, Logger, Utils, ImageProcessor, OpenAIService, MessageManager } from '../index';
import { systemPromptNotatkiRafala } from '../../data/S04/E05/prompts/systemPromptNotatkiRafala';

const logger = new Logger('S04E05');
const utils = new Utils();
const openAIService = new OpenAIService();

interface Question {
    instruction: string;
    description?: string;
}

interface FeedbackData {
    questionNumber: string;
    details: string;
}

interface ProcessResult {
    answers: Record<string, string>;
    proceed: boolean;
}

async function extractTextFromImage(imageBase64: string, openAIService: OpenAIService): Promise<string> {
    const messageManager = new MessageManager();
    
    // Add system message for OCR
    messageManager.addMessage('system', 'You are an OCR assistant. Extract all text from the provided image. Return only the extracted text, nothing else.');
    
    // Add image for OCR
    messageManager.addImageMessage(imageBase64, 'Please extract all text from this image.');
    
    // Get OCR result
    const ocrText = await openAIService.processText(messageManager.getMessages());
    return ocrText;
}

async function extractTextFromPdf(pdfPath: string, outputPath: string, outputPathText: string, logger: Logger): Promise<string> {
    const pdfProcessor = new PdfProcessor(logger);
    const imageProcessor = new ImageProcessor();
    const openAIService = new OpenAIService();

    // Step 1: Extract image and text from PDF
    const imageBuffer = await pdfProcessor.extractPageAsImage(pdfPath, 19, outputPath);
    const pdfText = await pdfProcessor.extractTextFromPdf(pdfPath, outputPathText);
    
    await logger.log(`Extracted image size: ${imageBuffer.length} bytes`);
    await logger.log(`Extracted PDF text length: ${pdfText.length} characters`);

    // Step 2: Process image
    const processedImage = await imageProcessor.loadImage(outputPath);
    await logger.log(`Processed image metadata: ${JSON.stringify(processedImage.metadata)}`);

    // Step 3: Extract text from image using OCR
    const imageText = await extractTextFromImage(processedImage.imageBase64, openAIService);
    await logger.log(`Extracted image text length: ${imageText.length} characters`);

    // Step 4: Combine text from PDF and image
    return `${pdfText}\n\n${imageText}`;
}

async function getNotatkiRafala(pdfPath: string, outputPath: string, outputPathText: string, notatkiPath: string): Promise<string> {
    // Check if cached file exists
    if (existsSync(notatkiPath)) {
        await logger.log(`Reading cached notatki from ${notatkiPath}`);
        return readFileSync(notatkiPath, 'utf-8');
    }

    // Process PDF and extract text
    await logger.log('Processing PDF and extracting text...');
    const notatki = await extractTextFromPdf(pdfPath, outputPath, outputPathText, logger);
    
    // Save to cache
    writeFileSync(notatkiPath, notatki, 'utf-8');
    await logger.log(`Saved notatki to ${notatkiPath}`);
    
    return notatki;
}

async function getAnswerForQuestion(messageManager: MessageManager): Promise<string> {
    const response = await openAIService.processTextAsJson(messageManager.getMessages(), '4o');
    await logger.log(`Response from llm ${JSON.stringify(response)}`)
    messageManager.addMessage('assistant', response.answer);
    return response.answer.trim();
}

async function processFeedback(feedback: string, messageManager: MessageManager): Promise<string> {
    const feedbackMessageManager = new MessageManager();
    feedbackMessageManager.addMessage('system', 'You are an assistant that analyzes feedback from Centrala. Extract ONLY the question number that needs to be fixed. If everything is correct, return -1.');
    feedbackMessageManager.addMessage('user', feedback);

    const response = await openAIService.processText(feedbackMessageManager.getMessages(), 'mini');
    return response;
}

async function processWithCentrala(
    answers: Record<string, string>,
    messageManagers: Map<string, MessageManager>,
): Promise<ProcessResult> {
    // Prepare response
    const response = {
        task: 'notes',
        apikey: process.env.POLIGON_API_KEY,
        answer: answers
    };
    
    // Send to Centrala
    const centralaResponse = await utils.sendToCentralaGlobal('notes', response, 'report') as { message?: string, hint?: string };
    await logger.log(`Centrala response: ${JSON.stringify(centralaResponse)}`);

    // Process feedback with mini model
    const questionId = await processFeedback(centralaResponse.message!, messageManagers.get('01')!);
    await logger.log(`LLM decision to fix question number: ${questionId}`);
    
    // If feedback indicates everything is correct, finish
    if (questionId === '-1') {
        await logger.log(`All answers are correct! Centrala response: ${centralaResponse}`);
        return { answers, proceed: false };
    }

    // Get the question ID and its message manager
    const messageManager = messageManagers.get(questionId)!;
    messageManager.addMessage('user', `hint for question: ${centralaResponse.hint!}`);
    
    const newAnswer = await getAnswerForQuestion(messageManager);
    await logger.log(`New answer for question ${questionId}: ${newAnswer}`);
    
    // Update answers with new response
    const updatedAnswers = { ...answers, [questionId]: newAnswer };
    
    // Continue the loop
    return { answers: updatedAnswers, proceed: true };
}

async function main() {
    const baseDir = join(process.cwd(), 'data', 'S04', 'E05');
    const pdfPath = join(baseDir, 'notatnik-rafala.pdf');
    const outputPath = join(baseDir, 'page19.png');
    const outputPathText = join(baseDir, 'extracted_text.txt');
    const notatkiRafalaPath = join(baseDir, 'notatki_rafala.txt');
    
    try {
        // Get notatki with caching
        const notatkiRafala = await getNotatkiRafala(pdfPath, outputPath, outputPathText, notatkiRafalaPath);
        
        // Get questions from Centrala
        const questions = await utils.getFileFromCentrala('notes.json', 'data/S04/E05') as Record<string, string>;
        
        // Create message managers for each question
        const messageManagers = new Map<string, MessageManager>();
        Object.keys(questions).forEach(id => {
            messageManagers.set(id, new MessageManager());
        });
        
        // Process each question
        const answers: Record<string, string> = {};
        for (const [id, question] of Object.entries(questions)) {
            await logger.log(`Processing question ${id}: ${question}`);
            const messageManager = messageManagers.get(id)!;

            // Add system message with context
            const systemPrompt = systemPromptNotatkiRafala(notatkiRafala, question);
            messageManager.addMessage('system', systemPrompt);
            messageManager.addMessage('user', 'find in notatki Rafala any information about answering question.');
            
            const answer = await getAnswerForQuestion(messageManager);
            await logger.log(`Answer for question ${id}: ${answer}`);
            answers[id] = answer;
        }
        
        // Process with Centrala in a loop
        let currentAnswers = answers;
        let shouldProceed = true;
        
        for (let i = 0; i < 5 && shouldProceed; i++) {
            await logger.log(`Iteration ${i + 1} of Centrala processing`);
            const result = await processWithCentrala(currentAnswers, messageManagers);
            currentAnswers = result.answers;
            shouldProceed = result.proceed;
        }

    } catch (error) {
        console.error('Error in main function:', error);
        await logger.error('Error in main function:', error);
    }
}

// Add proper async handling for the main function
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});