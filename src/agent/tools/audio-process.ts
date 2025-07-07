import { Utils, Logger, OpenAIService, MessageManager, TranscribeProcessor } from '../../index';
import { IDoc } from '../../types/types';
import { document } from '../metadata';
import { audioProcessPrompt } from '../prompts/tools/audioProcess';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class AudioProcessTool {
    private readonly utils: Utils;
    private readonly logger: Logger;
    private readonly openAIService: OpenAIService;
    private readonly transcribeProcessor: TranscribeProcessor;

    constructor(logger: Logger) {
        this.utils = new Utils();
        this.logger = logger;
        this.openAIService = new OpenAIService();
        this.transcribeProcessor = new TranscribeProcessor();
    }

    async processAudio(parameters: Record<string, any>, conversation_uuid: string): Promise<IDoc> {
        await this.logger.log(`AUDIO_PROCESS_TOOL --- params: ${JSON.stringify(parameters)}`);
        const { filePath, context, contextDocs } = parameters;

        if (!filePath || !context) {
            return document(`Missing required parameters: filePath and context are required, current parameters: ${JSON.stringify(parameters)}`, 'gpt-4o', {
                name: 'error',
                description: 'Parameter validation error',
                source: 'AudioProcessTool',
                content_type: 'error',
                conversation_uuid,
            });
        }

        const filename = filePath.split('/').pop() || '';
        const fullFilePath = join(__dirname, '../../../data/agent', filename);

        if (!existsSync(fullFilePath)) {
            return document(`File does not exist: ${fullFilePath}`, 'gpt-4o', {
                name: filename,
                description: 'File not found error',
                source: fullFilePath,
                content_type: 'error',
                conversation_uuid,
            });
        }

        // Load audio file
        let audioBuffer: Buffer;
        try {
            audioBuffer = readFileSync(fullFilePath);
        } catch (err) {
            return document(`Failed to read audio file: ${err}`, 'gpt-4o', {
                name: filename,
                description: 'File read error',
                source: fullFilePath,
                content_type: 'error',
                conversation_uuid,
            });
        }

        // Transcribe audio
        let transcription: string;
        try {
            const result = await this.transcribeProcessor.transcribe(audioBuffer);
            transcription = Array.isArray(result) ? result[0] : result;
        } catch (err) {
            return document(`Failed to transcribe audio: ${err}`, 'gpt-4o', {
                name: filename,
                description: 'Transcription error',
                source: fullFilePath,
                content_type: 'error',
                conversation_uuid,
            });
        }

        // Analyze transcription with LLM
        let analysis: string;
        try {
            const messageManager = new MessageManager();
            const promptWithContext = `${audioProcessPrompt}\n\n<context>${contextDocs}</context>`;
            messageManager.addMessage('system', promptWithContext);
            messageManager.addMessage('user', transcription);
            analysis = await this.openAIService.processText(messageManager.getMessages(), '4o');
        } catch (err) {
            return document(`Failed to analyze transcription: ${err}`, 'gpt-4o', {
                name: filename,
                description: 'LLM analysis error',
                source: fullFilePath,
                content_type: 'error',
                conversation_uuid,
            });
        }

        // Return document with both transcription and analysis
        return document(JSON.stringify({ transcription, analysis }), 'gpt-4o', {
            name: filename,
            description: `Audio file processed: ${filename}`,
            source: fullFilePath,
            content_type: 'complete',
            conversation_uuid,
        });
    }
} 