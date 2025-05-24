import { readFileSync } from "fs";
import { join } from "path";
import sharp from "sharp";
// import type { ResizedImageMetadata, ProcessImageOptions, ProcessedImageResult } from "../index";
import type { ResizedImageMetadata, ProcessImageOptions, ProcessedImageResult } from "../types/imageProcessor";

export class ImageProcessor {

    async loadImage(imageUrl: string, options?: ProcessImageOptions): Promise<ProcessedImageResult> {
        const { 
            maxX = 2048, 
            maxY = 2048, 
            compressionLevel = 7 
        } = options || {};

        try {
            const imageBuffer = readFileSync(imageUrl);
            const resizedImageBuffer = await sharp(imageBuffer)
                // .resize(maxX, maxY, { fit: 'inside' })
                .png({ compressionLevel })
                .toBuffer();

            const imageBase64 = resizedImageBuffer.toString('base64');
            const metadata = await sharp(resizedImageBuffer).metadata();

            if (!metadata.width || !metadata.height) {
                throw new Error("Unable to retrieve image dimensions.");
            }

            return { 
                imageBase64, 
                metadata: { 
                    width: metadata.width, 
                    height: metadata.height,
                    compressionLevel 
                } 
            };
        } catch (error) {
            console.error(`Image processing failed for ${imageUrl}:`, error);
            throw error;
        }
    }

    async loadImages(imageUrls: string[], options?: ProcessImageOptions): Promise<ProcessedImageResult[]> {
        try {
            return await Promise.all(imageUrls.map(url => this.loadImage(url, options)));
        } catch (error) {
            console.error("Batch image processing failed:", error);
            throw error;
        }
    }

    async calculateImageTokens(metadata: ResizedImageMetadata): Promise<number> {
        let tokenCost = 0;
        let { width, height, compressionLevel } = metadata;

        // High compression (6-9) means low detail, so we return base cost
        if (compressionLevel >= 6) {
            tokenCost += 85;
            return tokenCost;
        }

        const MAX_DIMENSION = 2048;
        const SCALE_SIZE = 768;

        // Resize to fit within MAX_DIMENSION x MAX_DIMENSION
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const aspectRatio = width / height;
            if (aspectRatio > 1) {
                width = MAX_DIMENSION;
                height = Math.round(MAX_DIMENSION / aspectRatio);
            } else {
                height = MAX_DIMENSION;
                width = Math.round(MAX_DIMENSION * aspectRatio);
            }
        }

        // Scale the shortest side to SCALE_SIZE
        if (width >= height && height > SCALE_SIZE) {
            width = Math.round((SCALE_SIZE / height) * width);
            height = SCALE_SIZE;
        } else if (height > width && width > SCALE_SIZE) {
            height = Math.round((SCALE_SIZE / width) * height);
            width = SCALE_SIZE;
        }

        // Calculate the number of 512px squares
        const numSquares = Math.ceil(width / 512) * Math.ceil(height / 512);

        // Calculate the token cost
        tokenCost += (numSquares * 170);

        return tokenCost;
    }
}
