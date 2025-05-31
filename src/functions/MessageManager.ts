import { 
    Message, 
    MessageArray, 
    MessageRole,
    ChatCompletionUserMessageParam,
    ChatCompletionContentPartImage,
    ChatCompletionContentPartText
} from "../index";

export class MessageManager {
    private messages: MessageArray;

    constructor(initialMessages: MessageArray = []) {
        this.messages = initialMessages;
    }

    addMessage(role: MessageRole, content: string): void {
        this.messages.push({ role, content });
    }

    addImageMessage(imageBase64: string, textContent: string = ''): void {
        const content: (ChatCompletionContentPartImage | ChatCompletionContentPartText)[] = [
            {
                type: "image_url",
                image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                    detail: "high" as const
                }
            },
            {
                type: "text",
                text: textContent
            }
        ];

        const message: ChatCompletionUserMessageParam = { role: "user", content };
        this.messages.push(message);
    }

    getMessages(): MessageArray {
        return [...this.messages];
    }

    clearMessages(): void {
        this.messages = [];
    }

    getLastMessage(): Message | undefined {
        return this.messages[this.messages.length - 1];
    }

    removeLastMessage(): void {
        this.messages.pop();
    }
} 