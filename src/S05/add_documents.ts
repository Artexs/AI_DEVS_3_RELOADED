import {  } from '../functions/DatabaseService';
import express, { Request, Response } from 'express';
import { OpenAIService, DatabaseService } from '../index';
import type { MessageArray } from '../index';

export const KEYWORD_EXTRACTION_PROMPT = `
You are an advanced AI assistant specializing in semantic analysis and information retrieval.

Your task is to extract a concise, unique, and highly descriptive list of 10 to 30 keywords (depending on message length) from the user's message.
- Prefer single words if possible; use short phrases only when absolutely necessary for clarity.
- The keywords should capture the deepest and most essential topics, concepts, entities, and themes present in the text.
- Avoid generic or overly broad terms; focus on specificity and uniqueness.
- Do not repeat keywords; each should add new semantic value.
- The keywords should be suitable for high-quality semantic search and similarity matching.
- Output only a comma-separated list of keywords, with no additional commentary or formatting.

Example input:
The rapid advancement of artificial intelligence in healthcare has enabled early disease detection, personalized treatment plans, and improved patient outcomes. Machine learning algorithms analyze vast datasets, identify patterns, and assist medical professionals in making data-driven decisions. However, ethical concerns such as data privacy, algorithmic bias, and the need for transparent AI systems remain significant challenges.

Example output:
ai, healthcare, algorithms, ethics, privacy, bias, detection, personalization, outcomes, transparency
`;

export async function addDocument(content: string) {
  const dbService = new DatabaseService();
  const openai = new OpenAIService();
  const messages: MessageArray = [
    { role: 'system', content: KEYWORD_EXTRACTION_PROMPT },
    { role: 'user', content }
  ];
  // Call LLM to extract keywords
  const keywords = await openai.processText(messages);
  await dbService.addDocument(content, keywords);
  console.log(`Added document to database - keywords: 
        ${keywords}`)
}



const startApi = async () => {
    const app = express();
    app.use(express.json());
    app.use(express.text());

    app.post('/api/db/', async (req: Request, res: Response) => {
    try {
        const content = req.body;
        if (!content || typeof JSON.stringify(content) !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid content in request body.' });
        }
        await addDocument(content);
        res.status(201).json({ message: 'Document added successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add document.' });
    }
    });


  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 add_documents API server running on port ${port}`);
  });
};

startApi().catch(console.error);
