import { Utils, Logger, OpenAIService, MessageManager } from '../../index';
import { IDoc } from '../../types/types';
import { document } from '../metadata';
import { ImageProcessor } from '../../functions/imageProcessor';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describeImagePrompt } from '../prompts/tools/describeImage';

export class DescribeImageTool {
    private readonly utils: Utils;
    private readonly logger: Logger;
    private readonly openAIService: OpenAIService;
    private readonly imageProcessor: ImageProcessor;

    constructor(logger: Logger) {
        this.utils = new Utils();
        this.logger = logger;
        this.openAIService = new OpenAIService();
        this.imageProcessor = new ImageProcessor();
    }

    async describeImage(parameters: Record<string, any>, conversation_uuid: string): Promise<IDoc> {
        const { filePath, context, contextDocs } = parameters;
        await this.logger.log(`DESCRIBE_IMAGE_TOOL --- params: ${JSON.stringify(parameters)}`);

        if (!filePath || !context) {
            return document(`Missing required parameters: filePath and context are required, current parameters: ${parameters}`, 'gpt-4o', {
                name: 'error',
                description: 'Parameter validation error',
                source: 'DescribeImageTool',
                content_type: 'error',
                conversation_uuid,
            });
        }
        const filename = filePath.split('/').pop() || '';
        const fullFilePath = join(__dirname, '../../../data/agent', filename);
        const outputPath = join(__dirname, '../../../data/agent', `${filename}.txt`);

        // Check if file exists
        if (!existsSync(fullFilePath)) {
            return document(`File does not exist: ${fullFilePath}`, 'gpt-4o', {
                name: filename,
                description: 'File not found error',
                source: fullFilePath,
                content_type: 'error',
                conversation_uuid,
            });
        }

        // Check if response already exists
        if (existsSync(outputPath)) {
            const existingResponse = readFileSync(outputPath, 'utf-8');
            return document(existingResponse, 'gpt-4o', {
                name: filename,
                description: `This is a cached response for image: "${outputPath}"`,
                source: fullFilePath,
                content_type: 'complete',
                conversation_uuid,
            });
        }

        // Process image
        await this.logger.log(`DESCRIBE_IMAGE_TOOL --- Processing image: ${fullFilePath}`);
        const processedImage = await this.imageProcessor.loadImage(fullFilePath);
        
        // Create messages using MessageManager
        const messageManager = new MessageManager();
        const promptWithContext = `${describeImagePrompt}\n\n<context>${contextDocs}</context>`;
        messageManager.addMessage('system', promptWithContext);
        messageManager.addImageMessage(processedImage.imageBase64, context);

        // Get response from LLM
        const responseText = await this.openAIService.processText(messageManager.getMessages(), '4o');

        // Save response
        writeFileSync(outputPath, responseText);
        await this.logger.log(`DESCRIBE_IMAGE_TOOL --- responseText: ${responseText}`);

        return document(responseText, 'gpt-4o', {
            name: filename,
            description: `This is a result of processing image: "${outputPath}"`,
            source: fullFilePath,
            content_type: 'complete',
            conversation_uuid,
        });
    }
}

