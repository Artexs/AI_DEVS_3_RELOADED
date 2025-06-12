import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { Logger } from './Logger';
import { pdfToImg } from 'pdftoimg-js';
import { pdfToText } from 'pdf-ts';

export class PdfProcessor {
    constructor(private logger: Logger) {}

    async checkPdfExists(pdfPath: string): Promise<void> {
        await this.logger.log('Checking if PDF file exists: ' + pdfPath);
        if (!existsSync(pdfPath)) {
            throw new Error(`PDF file not found at: ${pdfPath}`);
        }
    }

    async extractPageAsImage(pdfPath: string, pageNum: number, outputPath: string): Promise<Buffer> {
        try {
            await this.checkPdfExists(pdfPath);

            // Check if image already exists
            if (existsSync(outputPath)) {
                await this.logger.log(`Image for page ${pageNum} already exists at: ${outputPath}`);
                return await fs.readFile(outputPath);
            }

            const pdfBuffer = await fs.readFile(pdfPath);
            const images = await pdfToImg(pdfBuffer, {
                pages: [pageNum],
                scale: 2
            });
            await this.logger.log(`Successfully extracted page ${pageNum}`);

            if (images.length === 0) {
                throw new Error(`Page ${pageNum} not found in PDF`);
            }

            // Remove data URL prefix if present and convert to buffer
            const base64Data = images[0].replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            await fs.writeFile(outputPath, imageBuffer);
            await this.logger.log(`Successfully saved page ${pageNum} as image to: ${outputPath}`);
            return imageBuffer;
        } catch (error) {
            await this.logger.error(`Failed to extract page ${pageNum} as image:`, error);
            throw error;
        }
    }

    async extractTextFromPdf(pdfPath: string, outputPath: string): Promise<string> {
        try {
            await this.checkPdfExists(pdfPath);

            // Check if text already exists
            if (existsSync(outputPath)) {
                await this.logger.log(`Extracted text already exists at: ${outputPath}`);
                return await fs.readFile(outputPath, 'utf-8');
            }

            await this.logger.log('Reading PDF file from: ' + pdfPath);
            const pdfBuffer = await fs.readFile(pdfPath);
            await this.logger.log('PDF file read successfully, size: ' + pdfBuffer.length);
            
            await this.logger.log('Extracting text from PDF...');
            const text = await pdfToText(pdfBuffer);
            await this.logger.log('Text extracted successfully, length: ' + text.length);
            
            // Log first 200 characters for debugging
            await this.logger.log(`First 200 characters of extracted text: ${text.substring(0, 200)}`);
            
            await this.logger.log('Writing text to file: ' + outputPath);
            await fs.writeFile(outputPath, text);
            await this.logger.log(`Saved extracted text to: ${outputPath}`);
            return text;
        } catch (error) {
            console.error('Error in extractTextFromPdf:', error);
            await this.logger.error('Failed to extract text from PDF:', error);
            throw error;
        }
    }
} 