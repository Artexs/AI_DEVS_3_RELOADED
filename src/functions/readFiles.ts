import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { createReadStream } from 'fs';

export interface FileContent {
  name: string;
  buffer: Buffer;
  type: string;
}

export class FileReader {
  private readonly supportedAudioFormats = ['.m4a', '.mp3', '.wav'];
  private readonly supportedImageFormats = ['.jpg', '.jpeg', '.png', '.gif'];
  private readonly supportedTextFormats = ['.txt', '.json', '.md'];

  /**
   * Downloads a file from URL and saves it to specified path
   * @param url URL of the file to download
   * @param savePath Path where to save the file
   * @returns Promise with the path where file was saved
   */
  async downloadFile(url: string, savePath: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(savePath, buffer);
      return savePath;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Reads files of specified type from a directory
   * @param dirPath Directory path
   * @param fileType Type of files to read ('audio', 'image', 'text')
   * @returns Promise with array of file contents
   */
  async readFiles(dirPath: string, fileType: 'audio' | 'image' | 'text'): Promise<FileContent[]> {
    try {
      const files = await readdir(dirPath);
      const extensions = this.getExtensionsForType(fileType);
      const filteredFiles = files.filter(file => extensions.some(ext => file.endsWith(ext)));
      const contents: FileContent[] = [];

      for (const file of filteredFiles) {
        const filePath = join(dirPath, file);
        const buffer = await this.readFileContent(filePath);
        // const name = this.removeExtension(file);
        contents.push({ name: file, buffer, type: fileType });
      }

      return contents;
    } catch (error) {
      console.error(`Error reading directory or files: ${error}`);
      return [];
    }
  }

  /**
   * Reads a single file and returns its content as buffer
   * @param filePath Path to the file
   * @returns Promise with file buffer
   */
  private async readFileContent(filePath: string): Promise<Buffer> {
    const stream = createReadStream(filePath);
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }

  /**
   * Gets supported extensions for specified file type
   * @param fileType Type of files
   * @returns Array of supported extensions
   */
  private getExtensionsForType(fileType: 'audio' | 'image' | 'text'): string[] {
    switch (fileType) {
      case 'audio':
        return this.supportedAudioFormats;
      case 'image':
        return this.supportedImageFormats;
      case 'text':
        return this.supportedTextFormats;
      default:
        return [];
    }
  }

  /**
   * Removes file extension from filename
   * @param filename Filename with extension
   * @returns Filename without extension
   */
  private removeExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex === -1 ? filename : filename.slice(0, lastDotIndex);
  }

  /**
   * Gets file stats for a given path
   * @param filePath Path to the file
   * @returns Promise with file stats
   */
  async getFileStats(filePath: string) {
    return await stat(filePath);
  }
}
