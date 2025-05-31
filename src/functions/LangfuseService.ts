import { Langfuse, LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient } from 'langfuse';
import type { LangfusePromptClient } from "langfuse-core";
import { OpenAIService } from './OpenAIService';
import { MessageManager } from './MessageManager';
import type { 
  Message, 
  MessageArray, 
  MessageRole
} from "../index";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

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
  private promptName: string;

  constructor(promptName: string) {
    this.promptName = promptName;
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
    name: string = this.promptName,
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
    name: string = this.promptName,
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
    messages: MessageArray,
    model: 'mini' | '4o' = 'mini',
    temperature?: number
  ): Promise<string> {
    let generation;
    try {
      const prompt = await this.getPrompt(this.promptName);
      
      generation = this.trace.generation({
        name: this.promptName,
        input: messages,
        prompt
      });

      const response = await this.openai.processText(
        messages,
        model,
        temperature
      );

      messages.push({ role: 'assistant', content: response });

      generation.update({
        output: messages,
        model,
      });
      generation.end();

      return response;
    } catch (error) {
      if (generation) {
        generation.update({
          output: { error: error instanceof Error ? error.message : String(error) },
          model: 'unknown'
        });
        generation.end();
      }
      console.error(`Error processing prompt ${this.promptName}:`, error);
      throw error;
    }
  }

  public async generateTrace(): Promise<void> {
    this.trace = this.langfuse.trace({
      id: `${this.promptName}-${Date.now()}`,
      name: this.promptName,
      sessionId: `${this.promptName}-session`
    });

    this.langfuse.on("error", (error: Error) => {
      console.error("Langfuse error:", error);
    });
  }

  public async finalizeTrace(messages: MessageArray): Promise<void> {
    if (!this.trace) {
      throw new Error('No active trace found. Call generateTrace first.');
    }
    
    await this.trace.update({ 
      input: messages,
      output: { messages }
    });
    await this.langfuse.flushAsync();
    await this.langfuse.shutdownAsync();
  }
}