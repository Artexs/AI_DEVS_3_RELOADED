import express, { Request, Response, Application, RequestHandler } from 'express';
import {
    Utils,
    ImageProcessor,
    TranscribeProcessor,
    FileReader,
    OpenAIService,
    TextSplitter,
    VectorService,
    MessageManager
} from '../index';
import { LangfuseService } from '../functions/LangfuseService';

export const startApi = async () => {
    const app = express();
    const port = process.env.PORT || 3000;
    
    // Initialize services
    const langfuse = new LangfuseService('META_PROMPT_GENERATOR');
    const messageManager = new MessageManager();
    
    // Initialize system prompt and trace
    const systemPrompt = await langfuse.getCompiledPrompt();
    messageManager.addMessage('system', systemPrompt);
    
    // Middleware for JSON parsing
    app.use(express.json());

    // Define routes
    const getHandler: RequestHandler = (_req: Request, res: Response) => {
        console.log('🔵 Hello World');
        res.send('🔵 Hello World');
    };

    const postHandler: RequestHandler = async (req: Request, res: Response, next: Function) => {
        try {
            await langfuse.generateTrace();
            messageManager.addMessage('user', req.body.message);

            // Get response from LLM using Langfuse
            const response = await langfuse.llmRequest(
                messageManager.getMessages(),
                'mini'
            );

            messageManager.addMessage('assistant', response);

            // Finalize trace with all messages
            await langfuse.finalizeTrace(messageManager.getMessages());

            const assistantMessages = messageManager.getMessages().filter(msg => msg.role === 'assistant');
            console.log("Number of assistant responses:", assistantMessages.length);
            res.json({
                response
            });
        } catch (error) {
            console.error('Error processing chat:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    app.get('', getHandler);
    app.post('', postHandler);

    // Start server
    app.listen(port, () => {
        console.log(`🚀 Server is running on port ${port}`);
    });
};

// startApi().catch(console.error);