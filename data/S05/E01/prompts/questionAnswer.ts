import { Conversation } from '../../../../src/S05/1';

export const getQuestionAnswerPrompt = (conversations: string, facts: string): string => {
    return `You are an AI assistant analyzing conversations and facts to answer questions. Your task is to:

1. Analyze the provided conversations and facts
2. Answer the given question based on the information from conversations and facts
3. Provide a detailed explanation of your reasoning
4. Return ONLY a JSON object in this format:
{
    "_thinking": "Detailed explanation of your reasoning",
    "answer": "Your answer to the question"
}

<conversations>
${conversations}
</conversations>

<facts>
${facts}
</facts>

IMPORTANT:
- Return ONLY the JSON object, no other text
- Base your answer ONLY on the provided conversations and facts
- If you can't find a clear answer, explain why in _thinking
- Be precise and concise in your answer
- If the answer requires combining information from multiple sources, explain how in _thinking`;
}; 