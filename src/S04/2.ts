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

async function verifyDataAlternative(): Promise<void> {
  const openai = new OpenAIService();
  const messageManager = new MessageManager();
  const utils = new Utils();
  const logger = new Logger('S04E02');

  // Load all data
  const correctData = readFileSync(join(__dirname, '../../data/S04/lab_data/correct.txt'), 'utf-8');
  const incorrectData = readFileSync(join(__dirname, '../../data/S04/lab_data/incorect.txt'), 'utf-8');
  const verifyData = readFileSync(join(__dirname, '../../data/S04/lab_data/verify.txt'), 'utf-8');

  await logger.log('Loaded all data files');
  await logger.log(`Correct data: ${correctData.length}`);
  await logger.log(`Incorrect data: ${incorrectData.length}`);
  await logger.log(`Verify data: ${verifyData}`);

  // Prepare system message with examples
  const systemMessage = `You are a data validator. Your task is to analyze if the given data matches the pattern of correct data.
Here are examples of correct data:
${correctData}

Here are examples of incorrect data:
${incorrectData}

Analyze the given data and respond with ONLY "1" if it matches the pattern of correct data, or "0" if it matches the pattern of incorrect data.`;

  // Process verify data
  const verifyLines = verifyData.split('\n').filter(line => line.trim());
  const results: VerificationResult[] = [];

  for (const line of verifyLines) {
    const id = line.split('=')[0];
    const content = line.split('=').slice(1).join('=');

    await logger.log(`Processing line with ID: ${id} --- ${content}`);

    messageManager.clearMessages();
    messageManager.addMessage('system', systemMessage);
    messageManager.addMessage('user', content);

    const response = await openai.processText(
      messageManager.getMessages(),
      'mini'
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

async function analyzeDataPattern(): Promise<void> {
  const openai = new OpenAIService();
  const messageManager = new MessageManager();
  const logger = new Logger('S04E02');

  // Load data
  const correctData = readFileSync(join(__dirname, '../../data/S04/lab_data/correct.txt'), 'utf-8');
  const incorrectData = readFileSync(join(__dirname, '../../data/S04/lab_data/incorect.txt'), 'utf-8');

  await logger.log('Loaded data for pattern analysis');
  await logger.log(`Correct data length: ${correctData.length}`);
  await logger.log(`Incorrect data length: ${incorrectData.length}`);

  messageManager.clearMessages();
  messageManager.addMessage('system', 
    'You are a data pattern analyzer. Your task is to analyze the given data and identify patterns, language, and any distinguishing characteristics between correct and incorrect examples. ' +
    'Focus on identifying what makes the correct data valid and what makes the incorrect data invalid. ' +
    'Provide a detailed analysis of the patterns you observe.'
  );
  messageManager.addMessage('user', 
    `Here are examples of correct data:\n${correctData}\n\nHere are examples of incorrect data:\n${incorrectData}\n\n` +
    'Please analyze these examples and tell me:\n' +
    '1. What language or system is being used?\n' +
    '2. What patterns do you observe in the correct data?\n' +
    '3. What patterns do you observe in the incorrect data?\n' +
    '4. What are the key differences between correct and incorrect data?\n' +
    '5. How can we identify if a new example is correct or incorrect?'
  );

  const response = await openai.processText(
    messageManager.getMessages(),
    '4o'
  );

  await logger.log('Pattern analysis response:');
  await logger.log(response);
}

// Execute functions
// prepareTrainingData();
// verifyData().catch(console.error);
// verifyDataAlternative().catch(console.error);
analyzeDataPattern().catch(console.error);
