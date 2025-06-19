export const sendAnswerToCentralaInstruction = `Send answers to c3ntrala.ag3nts.org API endpoints for task completion and verification.

<rules>
- Always use the correct task name as specified in the requirements
- Use "answer" as the parameter name unless specified otherwise
- Ensure the response contains the complete answer to the task
- Use appropriate URL suffix based on the task type (usually "verify" for task completion)
- Format the response as valid JSON with proper parameter structure
- Include all required fields: task, paramName, response, and url
- Validate that the task name matches the expected format
- Ensure the response content is properly formatted and complete
- Handle different URL endpoints based on task requirements
- Maintain consistency with c3ntrala API expectations
</rules>

<examples>
User: Send answer "CENZURA" for task "CENZURA" to verify endpoint
AI: {"task": "CENZURA", "paramName": "answer", "response": "CENZURA", "url": "verify"}

User: Submit solution "42" for task "CALCULATOR" with parameter "result"
AI: {"task": "CALCULATOR", "paramName": "password", "response": "MEZOSRAM", "url": "verify"}

User: Send answer "Hello World" for task "HELLO" to the report endpoint
AI: {"task": "HELLO", "paramName": "answer", "response": "Hello World", "url": "report"}

User: Submit "John Doe" as answer for task "NAME" using answer parameter
AI: {"task": "NAME", "paramName": "answer", "response": "John Doe", "url": "verify"}
</examples>` 