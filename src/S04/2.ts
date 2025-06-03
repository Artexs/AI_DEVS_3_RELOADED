import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { OpenAIService, FileReader, MessageManager, Utils, Logger } from '../index';

interface TrainingExample {
  messages: {
    role: string;
    content: string;
  }[];
}

interface VerificationResult {
  id: string;
  result: string;
}

function prepareTrainingData(): void {
  // Read files
  const correctData = readFileSync(join(__dirname, '../../data/S04/lab_data/correct.txt'), 'utf-8');
  const incorrectData = readFileSync(join(__dirname, '../../data/S04/lab_data/incorect.txt'), 'utf-8');

  // Process correct examples
  const correctExamples = correctData
    .split('\n')
    .filter(line => line.trim())
    .map(line => ({
      messages: [
        { role: 'system', content: 'validate data' },
        { role: 'user', content: line },
        { role: 'assistant', content: '1' }
      ]
    }));

  // Process incorrect examples
  const incorrectExamples = incorrectData
    .split('\n')
    .filter(line => line.trim())
    .map(line => ({
      messages: [
        { role: 'system', content: 'validate data' },
        { role: 'user', content: line },
        { role: 'assistant', content: '0' }
      ]
    }));

  // Combine all examples
  const allExamples = [...correctExamples, ...incorrectExamples];

  // Convert to JSONL format
  const jsonlContent = allExamples
    .map(example => JSON.stringify(example))
    .join('\n');

  // Save to file
  writeFileSync(join(__dirname, '../../data/S04/lab_data/training_data.txt'), jsonlContent);
}

async function verifyData(): Promise<void> {
  const openai = new OpenAIService();
  const messageManager = new MessageManager();
  const utils = new Utils();
  const logger = new Logger('S04E02');
  
  const verifyData = readFileSync(join(__dirname, '../../data/S04/lab_data/verify.txt'), 'utf-8');
  await logger.log(`Starting data verification process ${verifyData}`);
  
  const lines = verifyData.split('\n').filter(line => line.trim());
  const results: VerificationResult[] = [];

  for (const line of lines) {
    const id = line.split('=')[0];
    const content = line.split('=').slice(1).join(' ');

    await logger.log(`Processing line with ID: ${id} --- ${content}`);

    messageManager.clearMessages();
    messageManager.addMessage('system', 'validate data');
    messageManager.addMessage('user', content);

    const response = await openai.processText(
      messageManager.getMessages(),
      'fine-tuned-mini'
    );

    await logger.log(`Response for ID ${id}: ${response}`);

    results.push({
      id,
      result: response
    });
  }

  const validResults = results
    .filter(r => r.result === '1')
    .map(r => r.id);

  await logger.log(`Found ${validResults.length} valid results: ${JSON.stringify(validResults)}`);

  // Send to centrala using Utils
  const response = await utils.sendToCentralaGlobal('research', { answer: validResults });
  await logger.log(`Response from centrala: ${JSON.stringify(response)}`);
}

// Execute both functions
// prepareTrainingData();
verifyData().catch(console.error);
