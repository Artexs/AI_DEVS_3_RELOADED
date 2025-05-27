import { createByModelName } from '@microsoft/tiktokenizer';
import * as fs from 'fs';
import * as path from 'path';

interface IDoc {
  text: string;
  metadata: {
    tokens: number;
    headers: Headers;
    urls: string[];
    images: string[];
  };
}

interface Headers {
  [key: string]: string[];
}

interface ProcessFileResult {
  file: string;
  avgChunkSize: string;
  medianChunkSize: number;
  minChunkSize: number;
  maxChunkSize: number;
  totalChunks: number;
}

export class TextSplitter {
  private tokenizer?: Awaited<ReturnType<typeof createByModelName>>;

  private readonly MODEL_NAME: string;
  private readonly SPECIAL_TOKENS = new Map<string, number>([
    ['<|im_start|>', 100264],
    ['<|im_end|>', 100265],
    ['<|im_sep|>', 100266],
  ]);

  constructor(modelName: string = 'gpt-4o') {
    this.MODEL_NAME = modelName;
  }

  private async initializeTokenizer(): Promise<void> {
    if (!this.tokenizer) {
      this.tokenizer = await createByModelName(this.MODEL_NAME, this.SPECIAL_TOKENS);
    }
  }

  private countTokens(text: string): number {
    if (!this.tokenizer) {
      throw new Error('Tokenizer not initialized');
    }
    const formattedContent = this.formatForTokenization(text);
    const tokens = this.tokenizer.encode(formattedContent, Array.from(this.SPECIAL_TOKENS.keys()));
    return tokens.length;
  }

  private formatForTokenization(text: string): string {
    return `<|im_start|>user\n${text}<|im_end|>\n<|im_start|>assistant<|im_end|>`;
  }

  async split(text: string, limit: number): Promise<IDoc[]> {
    console.log(`Starting split process with limit: ${limit} tokens`);
    await this.initializeTokenizer();
    const chunks: IDoc[] = [];
    let position = 0;
    const totalLength = text.length;
    const currentHeaders: Headers = {};

    while (position < totalLength) {
      console.log(`Processing chunk starting at position: ${position}`);
      const { chunkText, chunkEnd } = this.getChunk(text, position, limit);
      const tokens = this.countTokens(chunkText);
      console.log(`Chunk tokens: ${tokens}`);

      const headersInChunk = this.extractHeaders(chunkText);
      this.updateCurrentHeaders(currentHeaders, headersInChunk);

      const { content, urls, images } = this.extractUrlsAndImages(chunkText);

      chunks.push({
        text: content,
        metadata: {
          tokens,
          headers: { ...currentHeaders },
          urls,
          images,
        },
      });

      console.log(`Chunk processed. New position: ${chunkEnd}`);
      position = chunkEnd;
    }

    console.log(`Split process completed. Total chunks: ${chunks.length}`);
    return chunks;
  }

  private getChunk(text: string, start: number, limit: number): { chunkText: string; chunkEnd: number } {
    console.log(`Getting chunk starting at ${start} with limit ${limit}`);
    
    // Account for token overhead due to formatting
    const overhead = this.countTokens(this.formatForTokenization('')) - this.countTokens('');
    
    // Initial tentative end position
    let end = Math.min(start + Math.floor((text.length - start) * limit / this.countTokens(text.slice(start))), text.length);
    
    // Adjust end to avoid exceeding token limit
    let chunkText = text.slice(start, end);
    let tokens = this.countTokens(chunkText);
    
    while (tokens + overhead > limit && end > start) {
      console.log(`Chunk exceeds limit with ${tokens + overhead} tokens. Adjusting end position...`);
      end = this.findNewChunkEnd(text, start, end);
      chunkText = text.slice(start, end);
      tokens = this.countTokens(chunkText);
    }

    // Adjust chunk end to align with newlines without significantly reducing size
    end = this.adjustChunkEnd(text, start, end, tokens + overhead, limit);

    chunkText = text.slice(start, end);
    tokens = this.countTokens(chunkText);
    console.log(`Final chunk end: ${end}`);
    return { chunkText, chunkEnd: end };
  }

  private adjustChunkEnd(text: string, start: number, end: number, currentTokens: number, limit: number): number {
    const minChunkTokens = limit * 0.8; // Minimum chunk size is 80% of limit

    const nextNewline = text.indexOf('\n', end);
    const prevNewline = text.lastIndexOf('\n', end);

    // Try extending to next newline
    if (nextNewline !== -1 && nextNewline < text.length) {
      const extendedEnd = nextNewline + 1;
      const chunkText = text.slice(start, extendedEnd);
      const tokens = this.countTokens(chunkText);
      if (tokens <= limit && tokens >= minChunkTokens) {
        console.log(`Extending chunk to next newline at position ${extendedEnd}`);
        return extendedEnd;
      }
    }

    // Try reducing to previous newline
    if (prevNewline > start) {
      const reducedEnd = prevNewline + 1;
      const chunkText = text.slice(start, reducedEnd);
      const tokens = this.countTokens(chunkText);
      if (tokens <= limit && tokens >= minChunkTokens) {
        console.log(`Reducing chunk to previous newline at position ${reducedEnd}`);
        return reducedEnd;
      }
    }

    // Return original end if adjustments aren't suitable
    return end;
  }

  private findNewChunkEnd(text: string, start: number, end: number): number {
    // Reduce end position to try to fit within token limit
    let newEnd = end - Math.floor((end - start) / 10); // Reduce by 10% each iteration
    if (newEnd <= start) {
      newEnd = start + 1; // Ensure at least one character is included
    }
    return newEnd;
  }

  private extractHeaders(text: string): Headers {
    const headers: Headers = {};
    const headerRegex = /(^|\n)(#{1,6})\s+(.*)/g;
    let match;

    while ((match = headerRegex.exec(text)) !== null) {
      const level = match[2].length;
      const content = match[3].trim();
      const key = `h${level}`;
      headers[key] = headers[key] || [];
      headers[key].push(content);
    }

    return headers;
  }

  private updateCurrentHeaders(current: Headers, extracted: Headers): void {
    for (let level = 1; level <= 6; level++) {
      const key = `h${level}`;
      if (extracted[key]) {
        current[key] = extracted[key];
        this.clearLowerHeaders(current, level);
      }
    }
  }

  private clearLowerHeaders(headers: Headers, level: number): void {
    for (let l = level + 1; l <= 6; l++) {
      delete headers[`h${l}`];
    }
  }

  private extractUrlsAndImages(text: string): { content: string; urls: string[]; images: string[] } {
    const urls: string[] = [];
    const images: string[] = [];
    let urlIndex = 0;
    let imageIndex = 0;

    const content = text
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, altText, url) => {
        images.push(url);
        return `![${altText}]({{$img${imageIndex++}}})`;
      })
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, url) => {
        urls.push(url);
        return `[${linkText}]({{$url${urlIndex++}}})`;
      });

    return { content, urls, images };
  }

  /**
   * Processes a text file by splitting it into chunks and generating statistics.
   * 
   * Input:
   * - filePath: Path to the text file to process
   * - maxTokens: Maximum number of tokens per chunk (default: 1000)
   * - fileSuffix: File extension to remove when creating output (default: '.md')
   * 
   * Output:
   * - JSON file: Creates a {filename}.json with chunks and their metadata
   * - Returns object containing:
   *   - file: Original filename
   *   - avgChunkSize: Average tokens per chunk
   *   - medianChunkSize: Median tokens per chunk
   *   - minChunkSize: Smallest chunk size
   *   - maxChunkSize: Largest chunk size
   *   - totalChunks: Total number of chunks
   * 
   * Each chunk in the JSON contains:
   * - text: The actual content
   * - metadata: {
   *     tokens: number of tokens
   *     headers: extracted markdown headers
   *     urls: list of URLs found
   *     images: list of image URLs found
   *   }
   */
  async processFile(filePath: string, maxTokens: number = 1000, fileSuffix: string = '.md'): Promise<ProcessFileResult> {
    const text = fs.readFileSync(filePath, 'utf-8');
    const docs = await this.split(text, maxTokens);
    const jsonFilePath = path.join(path.dirname(filePath), `${path.basename(filePath, fileSuffix)}.json`);
    fs.writeFileSync(jsonFilePath, JSON.stringify(docs, null, 2));

    const chunkSizes = docs.map((doc: IDoc) => doc.metadata.tokens);
    const avgChunkSize = chunkSizes.reduce((sum: number, size: number) => sum + size, 0) / chunkSizes.length;
    const minChunkSize = Math.min(...chunkSizes);
    const maxChunkSize = Math.max(...chunkSizes);
    const medianChunkSize = chunkSizes.sort((a: number, b: number) => a - b)[Math.floor(chunkSizes.length / 2)];

    return {
      file: path.basename(filePath),
      avgChunkSize: avgChunkSize.toFixed(2),
      medianChunkSize,
      minChunkSize,
      maxChunkSize,
      totalChunks: chunkSizes.length
    };
  }
}

// console.table( await processFile(filePath) );
// USAGE
// Reads file, splits it into smaller chunks (maxTokens)
// saves as JSON in the same directory, and returns chunk statistics.