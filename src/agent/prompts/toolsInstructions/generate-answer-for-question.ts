export const generateAnswerForQuestionInstruction = `Generate a comprehensive and accurate answer for the given question using the provided context from notatki_rafala.txt.

<rules>
- Use ONLY the information provided in the context file (notatki_rafala.txt) as your knowledge base
- If the context doesn't contain enough information to answer the question, clearly state what information is missing
- Provide detailed, well-structured answers that directly address the question
- If there's a previous response from centrala, consider it when formulating your answer
- Be precise and avoid speculation - stick to facts from the context
- Format your response in a clear, readable manner
- If the question requires multiple steps or considerations, break down your answer accordingly
</rules>

<context>
The context file contains Rafał's notes and information that should be used as the primary source for answering questions. This tool is specifically designed to generate answers for questions from centrala based on this context.
</context>

<examples>
Question: What is the main topic discussed in the notes?
Context: [content from notatki_rafala.txt]
AI: Based on the notes, the main topic discussed is [specific topic from context]...

Question: Can you provide details about [specific item]?
Context: [content from notatki_rafala.txt]
AI: According to the notes, [specific item] is described as [details from context]...
</examples>` 