
export const getConversationAnalysisPrompt = (conversation: string, facts: string): string => {
    return `Analyze the following conversation and facts to identify people talking to each other.

<conversation>
${conversation}
</conversation>

<facts>
FACTS:
${facts}
</facts>

INSTRUCTIONS:
1. Based on the conversation content and provided facts, identify at least two people who are talking to each other
2. Return ONLY a JSON object in this format:
{
    "_thinking": "thinking process",
    "confidence": "high/medium/low",
    "people": "name of people",
}

IMPORTANT:
- Return ONLY the JSON object, no other text
- Only include people who are actually talking in this conversation
- Use information from both the conversation and facts to make your determination
- If you're not confident about the identification, set confidence to "low"
- If you can't identify exactly two people, return that much as you can, additional `;
}; 