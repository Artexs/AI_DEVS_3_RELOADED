# Factory Files Analysis Task

## Overview
This task involves analyzing various file formats from a factory to extract information about captured people and hardware issues. The process requires reading different file types, extracting text from images and audio, and categorizing the content.

## Technical Requirements
- TypeScript implementation
- OpenAI API (Whisper for audio, GPT-4 Vision for images)
- File processing utilities
- JSON response format

## Implementation Steps

### 1. File Loading and Filtering
```typescript
interface FileInfo {
    name: string;
    path: string;
    type: 'text' | 'image' | 'audio';
}

async function loadFactoryFiles(dirPath: string): Promise<FileInfo[]> {
    // Skip 'facts', 'extracted' directories and files without extension
    // Return array of FileInfo objects for valid files
}
```

### 2. Text Extraction Pipeline
```typescript
interface ExtractedContent {
    originalName: string;
    content: string;
    type: 'text' | 'image' | 'audio';
}

async function extractTextFromFiles(files: FileInfo[]): Promise<ExtractedContent[]> {
    // Process each file type:
    // - Text files: direct read
    // - Images: OCR using GPT-4 Vision
    // - Audio: Whisper transcription
    // Save extracted text with original filename reference
}
```

### 3. Content Analysis
```typescript
interface CategorizedContent {
    people: string[];
    hardware: string[];
}

async function analyzeContent(extractedContent: ExtractedContent[]): Promise<CategorizedContent> {
    // Use GPT-4 to analyze each text and categorize into:
    // - people: captured humans or traces of presence
    // - hardware: hardware-related issues
}
```

### 4. Response Generation
```typescript
interface SubmissionPayload {
    task: string;
    apikey: string;
    answer: {
        people: string[];
        hardware: string[];
    }
}

async function submitResults(categorizedContent: CategorizedContent): Promise<string> {
    // Format and submit results to Central API
}
```

## Main Process Flow
1. Load and filter factory files
2. Extract text from all file types
3. Analyze content for people and hardware information
4. Submit categorized results to Central API

## Error Handling
- Implement retry mechanism for API calls
- Handle file reading errors
- Validate extracted content
- Handle API rate limits

## Environment Variables Required
```env
OPENAI_API_KEY=your_openai_key
CENTRAL_API_KEY=your_central_key
```

## Notes
- Skip 'facts' and 'extracted' directories
- Skip files without extension
- Preserve original filenames in extracted content
- Sort filenames alphabetically in final response
- Task name in API: 'kategorie' 