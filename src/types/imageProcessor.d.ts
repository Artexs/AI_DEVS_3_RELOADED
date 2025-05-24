// Interface Definitions
export interface ResizedImageMetadata {
    width: number;
    height: number;
    compressionLevel: number;
}

export interface ProcessImageOptions {
    maxX?: number;
    maxY?: number;
    compressionLevel?: number;
}

export interface ProcessedImageResult {
    imageBase64: string;
    metadata: ResizedImageMetadata;
}

export interface ImageMessage {
    type: "image_url";
    image_url: {
        url: string;
        detail: 'low' | 'high';
    };
}

export interface TextMessage {
    type: "text";
    text: string;
}
