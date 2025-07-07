export const audioProcessInstruction = `
Use this tool to process audio files. 
Provide:
- filePath: the path to the audio file (must be a valid file in the agent's data directory)
- context: a short description of the task or what to focus on in the analysis
- contextDocs (optional): any additional context or documents to help the LLM analyze the transcription

The tool will:
1. Transcribe the audio file to text.
2. Analyze the transcription using an LLM, considering the provided context.
3. Return both the transcription and the analysis.
`; 