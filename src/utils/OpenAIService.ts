import OpenAI from "openai";
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { LLMResponse } from "../index"

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.7;

export class OpenAIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI();
    }

    createTextMessages(systemContent: string, userContent: string): ChatCompletionMessageParam[] {
        return [
            {
                role: "system",
                content: systemContent
            },
            {
                role: "user",
                content: userContent
            }
        ];
    }

    createImageMessages(systemContent: string, imageBase64: string, userContent: string = ''): ChatCompletionMessageParam[] {
        return [
            {
                role: "system",
                content: systemContent
            },
            {
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${imageBase64}`,
                            detail: "high"
                        }
                    },
                    {
                        type: "text",
                        text: userContent
                    }
                ]
            }
        ];
    }

    async processText(
        userMessage: string,
        systemContext: string,
        options: {
            model?: string;
            temperature?: number;
        } = {}
    ): Promise<LLMResponse> {
        const messages = this.createTextMessages(systemContext, userMessage);
        return this.completion(messages, options);
    }

    async processImage(
        imageBase64: string,
        systemContext: string,
        options: {
            model?: string;
            temperature?: number;
        } = {}
    ): Promise<LLMResponse> {
        const messages = this.createImageMessages(systemContext, imageBase64);
        return this.completion(messages, options);
    }

    private async completion(
        messages: ChatCompletionMessageParam[],
        options: {
            model?: string;
            temperature?: number;
        } = {}
    ): Promise<LLMResponse> {
        const response: ChatCompletion = await this.openai.chat.completions.create({
            model: options.model ?? DEFAULT_MODEL,
            messages,
            temperature: options.temperature ?? DEFAULT_TEMPERATURE
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No response content received from LLM');
        }

        try {
            const parsed = JSON.parse(content);
            return typeof parsed === 'string' ? parsed.trim() : parsed;
        } catch {
            return content.trim();
        }
    }
} 