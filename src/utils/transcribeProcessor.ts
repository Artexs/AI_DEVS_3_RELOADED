import OpenAI, { toFile } from "openai";

export class TranscribeProcessor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  /**
   * Transcribes audio content using OpenAI's Whisper model.
   * Can handle both single audio buffer and multiple audio files.
   * @param input Single audio buffer or array of named audio buffers
   * @returns Promise resolving to string or array of strings
   */
  async transcribe(input: Buffer | { name: string; buffer: Buffer }[]): Promise<string | string[]> {
    if (Buffer.isBuffer(input)) {
      return this.transcribeSingle(input);
    }
    return this.transcribeMultiple(input);
  }

  /**
   * Transcribes a single audio buffer
   * @param audioBuffer The audio buffer to transcribe
   * @returns Promise resolving to transcription text
   */
  private async transcribeSingle(audioBuffer: Buffer): Promise<string> {
    try {
      const transcription = await this.openai.audio.transcriptions.create({
        file: await toFile(audioBuffer, 'speech.m4a'),
        language: 'pl',
        model: 'whisper-1',
      });
      return transcription.text;
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw error;
    }
  }

  /**
   * Transcribes multiple audio files
   * @param audioFiles Array of named audio buffers
   * @returns Promise resolving to array of transcriptions
   */
  private async transcribeMultiple(audioFiles: { name: string; buffer: Buffer }[]): Promise<string[]> {
    const transcriptions: string[] = [];
    
    for (const file of audioFiles) {
      try {
        const transcription = await this.transcribeSingle(file.buffer);
        transcriptions.push(transcription);
      } catch (error) {
        console.error(`Error transcribing ${file.name}:`, error);
        transcriptions.push(''); // Add empty string for failed transcriptions
      }
    }
    
    return transcriptions;
  }
} 