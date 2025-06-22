import { Langfuse, LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient } from 'langfuse';
import type { LangfusePromptClient } from "langfuse-core";
import { OpenAIService, MODELS } from '../index';
import type { 
  Message, 
  MessageArray, 
  MessageRole
} from "../index";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { v4 as uuidv4 } from 'uuid';

export interface ProcessOptions {
  model?: 'mini' | '4o';
  temperature?: number;
}

export interface UsageStats {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export class LangfuseService {
  private langfuse: Langfuse;
  private openai: OpenAIService;
  private trace!: LangfuseTraceClient;

  constructor() {
    this.langfuse = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_HOST
    });
    this.openai = new OpenAIService();

    // if (process.env.NODE_ENV === 'development') {
    //   this.langfuse.debug();
    // }
  }

  private async getPrompt(
    name: string,
    version?: number,
    options?: {
      label?: string;
      cacheTtlSeconds?: number;
      fallback?: string;
      maxRetries?: number;
      type?: "text";
      fetchTimeoutMs?: number;
    }
  ): Promise<LangfusePromptClient> {
    return this.langfuse.getPrompt(name, version, options);
  }

  async getCompiledPrompt(
    name: string,
    compilationValues?: Record<string, any>,
    version?: number
  ): Promise<string> {
    const prompt = await this.getPrompt(name, version);
    return prompt.compile(compilationValues);
  }

  async createOrUpdatePrompt(
    name: string,
    content: string | MessageArray,
    version?: number,
    options?: {
      label?: string;
      type?: "text" | "chat";
      description?: string;
    }
  ): Promise<LangfusePromptClient> {
    try {
      const existingPrompt = this.langfuse.getPrompt(name, version);
      return existingPrompt;
    } catch {
      return this.langfuse.createPrompt({
        name,
        prompt: content,
        isActive: true,
        ...options
      });
    }
  }

  async llmRequest(
    langfuseSpanName: string,
    messages: ChatCompletionMessageParam[],
    model: keyof typeof MODELS = 'mini',
    temperature?: number,
    jsonMode: boolean = false,  // change to undefined when dealing with BIELIK
  ): Promise<string> {
    let span;
    try {
      // this.trace.generation
      span = this.trace.span({
        name: langfuseSpanName,
        input: messages
      });

      const response = await this.openai.processText(
        messages,
        model,
        temperature,
        jsonMode
      );

      // Create generation within span
      const generation = span.generation({
        name: langfuseSpanName,
        model: MODELS[model],
        modelParameters: {
          temperature: temperature || 0.7,
        },
        input: messages,
        output: response,
        // usage: {
        //   promptTokens: output.usage?.prompt_tokens,
        //   completionTokens: output.usage?.completion_tokens,
        //   totalTokens: output.usage?.total_tokens,
        // },
      });
      generation.end();
      span.end();

      return response;
    } catch (error) {
      if (span) {
        span.update({
          output: { error: error instanceof Error ? error.message : String(error) },
          metadata: { model: 'unknown' }
        });
        span.end();
      }
      console.error(`Error processing prompt ${langfuseSpanName}:`, error);
      throw error;
    }
  }

  async llmRequestAsJson(
    langfuseSpanName: string,
    messages: ChatCompletionMessageParam[],
    model: keyof typeof MODELS = 'mini',
    temperature?: number
  ): Promise<Record<string, any>> {
    const response = await this.llmRequest(langfuseSpanName, messages, model, temperature, true);
    const parsed = JSON.parse(response);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error(`Response from LLM is not a valid JSON object --- object: ${response}`);
    }
    return parsed;
  }

  public async generateTrace(name: string, sessionId: string): Promise<void> {
    this.trace = this.langfuse.trace({
      id: `${Date.now()}-${uuidv4()}`,
      name,
      sessionId
    });

    this.langfuse.on("error", (error: Error) => {
      console.error("Langfuse error:", error);
    });
  }

  public async finalizeTrace(messages: MessageArray): Promise<void> {
    if (!this.trace) {
      throw new Error('No active trace found. Call generateTrace first.');
    }
    const userMessage = messages.find(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    await this.trace.update({ 
      input: userMessage,
      output: { assistantMessages }
    });
    await this.langfuse.flushAsync();
    await this.langfuse.shutdownAsync();
  }
}