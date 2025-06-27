import { Utils, Logger } from '../../index';
import { IDoc } from '../../types/types';
import { document } from '../metadata';
import { promises as fs } from 'fs';
import path from 'path';

export type AnswersFile = {
  questionNumber: number;
  answers: {
    "01": string;
    "02": string;
    "03": string;
    "04": string;
    "05": string;
  };
};

const defaultAnswers: AnswersFile = {
  questionNumber: 1,
  answers: {
    "01": 'placeholder',
    "02": 'placeholder',
    "03": 'placeholder',
    "04": 'placeholder',
    "05": 'placeholder',
  },
};

const ANSWERS_FILE_PATH = path.join(process.cwd(), 'data', 'agent', 'questions-answers-temp.json');

export async function loadAnswers(): Promise<AnswersFile> {
  try {
    await fs.access(ANSWERS_FILE_PATH);
    const data = await fs.readFile(ANSWERS_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(path.dirname(ANSWERS_FILE_PATH), { recursive: true });
      await fs.writeFile(ANSWERS_FILE_PATH, JSON.stringify(defaultAnswers, null, 2), 'utf-8');
      return { ...defaultAnswers };
    }
    throw err;
  }
}

export async function updateAnswers(data: AnswersFile): Promise<void> {
  await fs.writeFile(ANSWERS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export class ContactCentralaTool {
    private readonly utils: Utils;
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.utils = new Utils();
        this.logger = logger;
    }

    async sendAnswer(parameters: Record<string, any>, conversation_uuid: string): Promise<IDoc> {
        await this.logger.logJson('sendAnswer from contact centrala processing...', parameters)
        const { task, paramName, response, url } = parameters;
        // const param = { [paramName]: response };
        
        // await this.logger.log(`Sending answer for task: ${task} --- params: ${param}`);
        const urlSuffix = url.includes('/') 
                ? url.split('/').pop() 
                : url;
        const centralaAnswerJSON = await this.utils.sendToCentralaGlobal(task, { [paramName]: response }, urlSuffix);
        const centralaAnswer = JSON.stringify(centralaAnswerJSON);
        await this.logger.logJson('response from contact centrala processing...', centralaAnswerJSON)

        const respose = document(centralaAnswer, 'gpt-4o', {
            name: `centrala_response_${task}`,
            description: `Response from Centrala for task: ${task}`,
            source: 'centrala',
            content_type: 'complete',
            conversation_uuid,
        });
        return respose;
    }
}

