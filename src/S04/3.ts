import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import axios from 'axios';
import { Utils, Logger, OpenAIService, MessageManager } from '../index';
import { WEBSITE_ANALYSIS_PROMPT } from '../../data/S04/E03/prompts/websiteAnalysis';
import { LINK_EXTRACTION_PROMPT } from '../../data/S04/E03/prompts/linkExtraction';
import { error } from 'console';

const WEBSITES_DIR = join(__dirname, '../../data/S04/E03/websites');
const utils = new Utils();
const logger = new Logger('S04E03');
const baseURL = 'https://softo.ag3nts.org';

interface WebsiteContent {
  content: string;
  timestamp: number;
}

interface CentralaTask {
  [key: string]: string;
}

interface WebsiteAnalysis {
  hasAnswer: boolean;
  answer: string | null;
  suggestedLink: string | null;
}

interface Task {
  id: string;
  question: string;
}

export class WebsiteAnalyzer {
  private readonly websitesDir: string;
  private readonly utils: Utils;
  private readonly logger: Logger;
  private readonly visitedUrls: Set<string>;
  private readonly allUrls: Set<string>;
  private answers: Record<string, string>;

  constructor() {
    this.websitesDir = WEBSITES_DIR;
    this.utils = utils;
    this.logger = logger;
    this.visitedUrls = new Set();
    this.allUrls = new Set();
    this.answers = {};
  }

  private async ensureWebsitesDir(): Promise<void> {
    if (!existsSync(this.websitesDir)) {
      await mkdir(this.websitesDir, { recursive: true });
    }
  }

  private urlToFilename(url: string): string {
    return url.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private async getWebsiteContent(url: string): Promise<string> {
    try {
      await this.ensureWebsitesDir();
      const filename = this.urlToFilename(url);
      const filePath = join(this.websitesDir, filename);

      // Check if file exists
      if (existsSync(filePath)) {
        const cached = JSON.parse(await readFile(filePath, 'utf-8')) as WebsiteContent;
        return cached.content;
      }

      // Download and process website
      const response = await axios.get(url);
      const html = response.data;
      const markdown = new NodeHtmlMarkdown().translate(html);

      // Save to cache
      const websiteContent: WebsiteContent = {
        content: markdown,
        timestamp: Date.now()
      };

      await writeFile(filePath, JSON.stringify(websiteContent, null, 2));
      return markdown;

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to process website ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  private async findNextUrl(content: string, question: string, currentUrl: string): Promise<string> {
    try {
      const openai = new OpenAIService();
      const messageManager = new MessageManager();
      
      const systemPrompt = LINK_EXTRACTION_PROMPT.replace('{content}', content);
      messageManager.addMessage('system', systemPrompt);
      messageManager.addMessage('user', question);

      const responseString = await openai.processText(
        messageManager.getMessages(),
        '4o'
      );

      await this.logger.log(`Url extraction response: "url":"${responseString}`);
      const response = JSON.parse(responseString);
      // await this.logger.log(JSON.stringify(response));
      // await this.logger.log(`Url extraction response: "url":"${response.answer}" --- ${response._thinking}`);
      
      if (response.answer === 'no data') {
        this.logger.error("error - no url in website")
        throw error("error - no url in website")
      }

      // Normalize URLs to ensure they all start with http/https
      // this.logger.log(`urls returned by llm: ${response.answer}`)
      const normalizedUrls = response.answer.map((url: string) => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        return `${baseURL}${url}`;
      });
      this.logger.log(`normalizedUrls returned by llm: ${normalizedUrls.join(",  ")}`)

      // Add all URLs to the allUrls set
      normalizedUrls.forEach((url: string) => this.allUrls.add(url));

      // Find first unvisited URL
      for (const url of normalizedUrls) {
        if (!this.visitedUrls.has(url)) {
          return url;
        }
      }

      this.logger.error("No unvisited URLs found")
      // throw error("No unvisited URLs found")
      return baseURL;
    } catch (error) {
      if (error instanceof Error) {
        await this.logger.error('Failed to find next link', error);
        throw error;
      }
      throw error;
    }
  }

  private async generateAnswer(content: string, question: string): Promise<string> {
    const openai = new OpenAIService();
    const messageManager = new MessageManager();
    
    const systemPrompt = WEBSITE_ANALYSIS_PROMPT.replace('{content}', content);
    messageManager.addMessage('system', systemPrompt);
    messageManager.addMessage('user', question);

    const response = await openai.processTextAsJson(
      messageManager.getMessages(),
      'mini'
    );

    await this.logger.log(`Website analysis response: "answer":"${response.answer}" --- ${response._thinking}`);     
    return response.answer;
  }

  public async getCentralaTasks(): Promise<Task[]> {
    try {
      const tasksFilePath = join(__dirname, '../../data/S04/E03/tasksFromCentrala.json');
      
      // Check if tasks file exists
      if (existsSync(tasksFilePath)) {
        const cachedTasks = JSON.parse(await readFile(tasksFilePath, 'utf-8')) as Task[];
        await this.logger.log(`Loaded cached tasks: ${JSON.stringify(cachedTasks)}`);
        return cachedTasks;
      }

      // Download tasks if not cached
      const response = await this.utils.sendToCentralaGlobal('softo', {}, `data/${process.env.POLIGON_API_KEY}/softo.json`);
      const tasks = typeof response === 'string' ? JSON.parse(response) : response as CentralaTask;
      await this.logger.log(`Downloaded tasks: ${JSON.stringify(response)}`);
      
      const formattedTasks = Object.entries(tasks).map(([id, question]) => ({
        id,
        question: String(question)
      }));

      // Save tasks to file
      await writeFile(tasksFilePath, JSON.stringify(formattedTasks, null, 2));
      await this.logger.log(`Saved tasks to file: ${tasksFilePath}`);
      
      return formattedTasks;
    } catch (error) {
      if (error instanceof Error) {
        await this.logger.error('Failed to download tasks', error);
        throw new Error(`Failed to download tasks: ${error.message}`);
      }
      throw error;
    }
  }

  private async processTask(task: Task): Promise<void> {
    this.visitedUrls.clear();
    this.allUrls.clear();
    let currentUrl = baseURL;

    try {

      for(let it = 0; it < 15; it++) {
        await this.logger.log(`Analyzing URL: ${currentUrl}`);
        const content = await this.getWebsiteContent(currentUrl);
        const analysis = await this.generateAnswer(content, task.question);
  
        if (analysis === 'no data') {
          this.visitedUrls.add(currentUrl);
          currentUrl = await this.findNextUrl(content, task.question, currentUrl);
          continue;
        }
  
        await this.logger.success(`Found answer for task ${task.id}: ${analysis}`);
        this.answers[task.id] = analysis;
        return;
      }

    } catch (error) {
      if (error instanceof Error) {
        await this.logger.error('Failed to analyze question', error);
        throw error;
      }
      throw error;
    }

    await this.logger.error(`No answer found for task ${task.id}`);
    this.answers[task.id] = 'No answer found';
  }

  public async run(): Promise<Record<string, string>> {
    try {
      const tasks = await this.getCentralaTasks();
      this.answers = {};

      for (const task of tasks) {
        await this.logger.log(`Processing task ${task.id}: ${task.question}`);
        await this.processTask(task);
      }
      // const secretPrompt: Task = {
      //   id: '01',
      //   question: `Find any information about 'numer', 'agent', 'piąty', '5' or any text containing {{FLG:xxx}} pattern`
      // };
      // await this.processTask(secretPrompt);

      await this.logger.log(`Final answers: ${JSON.stringify(this.answers, null, 2)}`);
      await this.sendAnswersToCentrala();
      return this.answers;
    } catch (error) {
      if (error instanceof Error) {
        await this.logger.error('Failed to run analysis', error);
        throw error;
      }
      throw error;
    }
  }

  private async sendAnswersToCentrala(): Promise<void> {
    try {
      const report = {
        task: 'softo',
        apikey: process.env.POLIGON_API_KEY,
        answer: this.answers
      };

      const response = await this.utils.sendToCentralaGlobal('softo', report, '/report');
      await this.logger.success(`Successfully sent answers to Centrala --- ${JSON.stringify(response)}`);
    } catch (error) {
      if (error instanceof Error) {
        await this.logger.error('Failed to send answers to Centrala', error);
        throw error;
      }
      throw error;
    }
  }
}

const website = new WebsiteAnalyzer()
website.run()
