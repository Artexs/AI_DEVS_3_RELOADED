import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions";
import { MessageArray } from "../index";

const MODELS = {
    'mini': "gpt-4o-mini",
    '4o': "gpt-4o",
    'fine-tuned-mini': 'ft:gpt-4o-mini-2024-07-18:personal:ai-devs-3r-fine-tuning:BeNTB6Vw'
} as const;

const DEFAULT_TEMPERATURE = 0.7;

export class OpenAIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI();
    }

    async processText(
        messages: MessageArray,
        model: keyof typeof MODELS = 'mini',
        temperature: number = DEFAULT_TEMPERATURE
    ): Promise<string> {
        const response: ChatCompletion = await this.openai.chat.completions.create({
            model: MODELS[model],
            messages,
            temperature
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No response content received from LLM');
        }

        return content.trim();
    }

    async processTextAsJson(
        messages: MessageArray,
        model: keyof typeof MODELS = 'mini',
        temperature: number = DEFAULT_TEMPERATURE
    ): Promise<Record<string, any>> {
        const response = await this.processText(messages, model, temperature);
        const parsed = JSON.parse(response);
        if (typeof parsed !== 'object' || parsed === null) {
            throw new Error(`Response from LLM is not a valid JSON object --- object: ${response}`);
        }
        return parsed;
    }
} 