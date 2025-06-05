export const WEBSITE_ANALYSIS_PROMPT = `You are an AI assistant analyzing website content. Your task is to:

1. Analyze the provided website content
2. Determine if it contains an answer to the given question
3. If yes, provide a concise answer
4. If no, response with 'no data' in answer

<websiteContent>
{content}
</websiteContent>

Please respond in the following format:
{
  "_thinking": "place for preparing answer in llm",
  "answer": "answer for question"
}`; 