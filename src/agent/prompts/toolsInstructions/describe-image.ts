export const describeImageInstruction = `Analyze images to extract text content or provide detailed descriptions when text extraction is not possible.

<rules>
- First attempt to extract and read any text visible in the image
- Use OCR capabilities to identify and transcribe text accurately
- Pay attention to text in different orientations, fonts, and sizes
- Consider handwritten text, printed text, and digital text
- If text extraction is impossible or unclear, provide a comprehensive description
- Describe the main subjects, objects, people, scenes, or content visible
- Include relevant details about colors, layout, style, and context
- Consider the context provided in the input to focus on relevant aspects
- Provide clear, structured output with extracted text or detailed description
- Handle various image types: documents, photos, screenshots, diagrams, etc.
- Maintain accuracy and avoid speculation when text is unclear
</rules>

<examples>
User: Analyze image at "data/documents/receipt.jpg" with context "financial document"
AI: {"filePath": "data/documents/receipt.jpg", "context": "financial document"}

User: Extract text from "screenshots/error_message.png" - focus on error details
AI: {"filePath": "screenshots/error_message.png", "context": "focus on error details"}

User: Describe what's in "photos/meeting_room.jpg" - looking for whiteboard content
AI: {"filePath": "photos/meeting_room.jpg", "context": "looking for whiteboard content"}

User: Read text from "data/S04/E05/page19.png" - extract all visible text
AI: {"filePath": "data/S04/E05/page19.png", "context": "extract all visible text"}
</examples>` 