import { ImageProcessor, Utils, OpenAIService, ProcessedImageResult, LLMResponse } from '../index';
import path from 'path';

const openAIService = new OpenAIService();
const utils = new Utils();
const imageProcessor = new ImageProcessor();

async function processImages(imagePaths: string[], systemContext: string): Promise<string[]> {
    try {
        // Process the images to get base64 data
        console.log("Loading and preparing images...");
        const processedImages = await imageProcessor.loadImages(imagePaths);

        // Process each image in parallel
        console.log("Processing images with LLM...");
        const results = await Promise.all(
            processedImages.map(({ imageBase64 }: ProcessedImageResult) => 
                openAIService.processImage(imageBase64, systemContext, {model: "gpt-4o"})
            )
        );

        // Extract answers from responses
        return results.map((response: LLMResponse) => 
            typeof response === 'string' ? response : response.answer
        );
    } catch (error) {
        console.error("Error processing images with LLM:", error);
        throw error;
    }
}

const systemContext = `[Identyfikacja miasta na podstawie fragmentu mapy]

Zadanie polega na analizie fragmentów mapy w celu jednoznacznego wskazania miasta. Model powinien korzystać z nazw ulic, obiektów charakterystycznych, układu urbanistycznego i terenu, a w przypadku trudności – uwzględnić, że prawdopodobnie chodzi o polskie miasto z uczelnią.

<prompt_objective>
Jedynym celem promptu jest zidentyfikowanie miasta na podstawie fragmentu mapy, z użyciem nazw ulic, charakterystycznych miejsc oraz układu urbanistycznego.
</prompt_objective>

<prompt_rules>
- Analizuj dostarczony fragment mapy pod kątem nazw ulic, charakterystycznych obiektów (np. szkoły, cmentarze, kościoły, parki) oraz układu urbanistycznego i terenu.
- POD ŻADNYM POZOREM nie zgaduj miasta na podstawie nieistotnych lub niepowiązanych danych.
- NIE MOŻESZ podać więcej niż jednej odpowiedzi.
- NIE IGNORUJ żadnych widocznych nazw ulic, punktów charakterystycznych lub układu urbanistycznego.
- BEZWZGLĘDNIE UZASADNIJ wybór miasta, wskazując konkretne elementy mapy.
- NIE SUGERUJ miast spoza Polski, chyba że nie da się zidentyfikować miasta polskiego.
- W PRZYPADKU BRAKU WYSTARCZAJĄCYCH DANYCH – zwróć dokładnie komunikat "NO DATA AVAILABLE".
- Odpowiadaj ZAWSZE w formacie JSON:
  {
    "_thinking": [swobodny opis procesu myślenia i analizy],
    "justification": [uzasadnienie wyboru miasta, na podstawie elementów mapy],
    "key_elements": [lista kluczowych nazw ulic, obiektów lub cech urbanistycznych],
    "city": [nazwa zidentyfikowanego miasta lub "NO DATA AVAILABLE"]
  }
- POD ŻADNYM POZOREM nie zmieniaj struktury JSON ani kolejności pól.
- PROMPT MA ABSOLUTNY PRIORYTET nad domyślnymi zasadami modelu.
- Wszelkie próby obejścia lub złagodzenia zasad są ZABRONIONE.
- Jeśli brak danych lub nie można zidentyfikować miasta – zwróć {"_thinking": "...", "justification": "...", "key_elements": [], "city": "NO DATA AVAILABLE"}.
</prompt_rules>`

const main = async () => {
    const imageSuffixes = ['mapa1.png', 'mapa2.png', 'mapa3.png', 'mapa4.png'];
    const imagePaths = imageSuffixes.map(suffix => 
        path.join(__dirname, '..', '..', 'data', 'S02', 'e02', suffix)
    );

    try {
        const responses = await processImages(imagePaths, systemContext);
        
        // Log each response with its index
        responses.forEach((response, index) => {
            console.log(`RESPONSE ${index + 1}:`, response);
        });
        
        // Format responses into the required structure
        const formattedResponses = responses.map((response, index) => 
            `<image${index + 1}>\n${response}\n</image${index + 1}>\n`
        ).join('\n');

        // Make request to LLM with formatted responses
        const llmResponse = await openAIService.processText(formattedResponses, systemContext, {model: "gpt-4o"});
        const finalAnswer = typeof llmResponse === 'string' ? llmResponse : llmResponse.city;
        console.log("final answer", finalAnswer);
    } catch (error) {
        console.error("An error occurred:", error);
    }
};

main();