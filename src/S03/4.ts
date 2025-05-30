import { FileReader, OpenAIService, Utils } from '../index';

interface ExtractionResult {
    _thinking: string;
    people: string[];
    places: string[];
}

interface ApiResponse {
    places?: string[];
    people?: string[];
}

const utils = new Utils();

async function downloadAndProcessBarbaraFile(): Promise<ExtractionResult> {
    const fileReader = new FileReader();
    const openAIService = new OpenAIService();

    // Download file
    const response = await fetch('https://c3ntrala.ag3nts.org/dane/barbara.txt');
    const text = await response.text();

    // Prepare LLM prompt
    const systemPrompt = `You are a precise text analyzer. Your task is to:
1. Extract ONLY FIRST NAMES of people and cities from the given text
2. Use _thinking to save all peoples and places.
3. Convert all names to nominative case (mianownik in Polish)
4. Remove any Polish diacritics (any Ł needs to be returned as L)
5. Validate and correct any typos in names and places
6. Return ONLY a JSON object with this structure:
{
    "_thinking": "Your reasoning about what you found",
    "people": ["LIST", "OF", "FIRST", "NAMES", "IN", "NOMINATIVE", "CASE"],
    "places": ["LIST", "OF", "CITIES", "IN", "UPPERCASE"]
}

Rules:
- Extract ONLY FIRST NAMES (e.g., from "Rafał Kowalski" return only "RAFAL")
- All names must be in nominative case
- All cities must be in UPPERCASE
- Remove ALL Polish diacritics
- Validate and correct any typos in names (e.g., "Jhon" -> "JOHN", "Marek" -> "MAREK")
- Return ONLY the JSON object, no other text
- DO NOT include surnames in the output`;

    const result = await openAIService.processTextAsJson(text, systemPrompt, {
        model: "mini",
        temperature: 0.1
    });
    console.log(result)
    return result as ExtractionResult;
}

async function queryPeopleApi(name: string): Promise<string[]> {
    const data = await utils.sendToCentralaGlobal('', {
        query: name.toUpperCase()
    }, 'people');
    
    if (data.message.includes('*') || /[a-z]/.test(data.message)) {
        console.log(`WARNING - ${data.message}`);
        return [];
    }
    console.log('Found places:', data.message);
    return data.message.split(' ');
}

async function queryPlacesApi(city: string): Promise<string[]> {
    const data = await utils.sendToCentralaGlobal('', {
        query: city.toUpperCase()
    }, 'places');
    
    if (data.message.includes('*') || /[a-z]/.test(data.message)) {
        console.log(`WARNING - ${data.message}`);
        return [];
    }

    if (data.message.includes('BARBARA') && city !== 'KRAKOW') {
        console.log(data.message)
        console.log(`Found city with Barbara: ${city}`);
        // const response = await reportAnswer(city);
        // throw new Error(response);
    }

    console.log('Found people:', data.message);
    return data.message.split(' ');
}

async function processSets(peopleSet: Set<string>, placesSet: Set<string>): Promise<void> {
    // Process people
    console.log("PEOPLES: ", Array.from(peopleSet).join(", "))
    for (const person of peopleSet) {
        console.log(`\nQuerying places for person: ${person}`);
        const places = await queryPeopleApi(person);
        if (person !== "BARBARA") {
            places.forEach(place => placesSet.add(place));
        }
    }

    // Process places
    console.log("PLACES: ", Array.from(placesSet).join(", "))
    for (const place of placesSet) {
        console.log(`\nQuerying people for place: ${place}`);
        const people = await queryPlacesApi(place);
        people.forEach(person => peopleSet.add(person));
    }
}

async function reportAnswer(answer: string): Promise<void> {
    const response = await utils.sendToCentralaGlobal('', {
        task: "loop",
        answer: answer
    }, 'report');
    
    console.log('Report response:', response);
}

// Main execution
async function main() {
    try {
        // Initialize sets
        const peopleSet = new Set<string>();
        const placesSet = new Set<string>();

        // Get initial data
        const result = await downloadAndProcessBarbaraFile();
        
        // Add initial data to sets
        result.people.forEach(person => peopleSet.add(person));
        result.places.forEach(place => placesSet.add(place));

        console.log('Initial sets:');
        console.log('People:', Array.from(peopleSet));
        console.log('Places:', Array.from(placesSet));

        let previousPeopleSize = 0;
        let previousPlacesSize = 0;
        let iteration = 1;

        while (true) {
            console.log(`\nIteration ${iteration}:`);
            console.log('Current sizes - People:', peopleSet.size, 'Places:', placesSet.size);
            
            previousPeopleSize = peopleSet.size;
            previousPlacesSize = placesSet.size;

            await processSets(peopleSet, placesSet);

            if (peopleSet.size === previousPeopleSize && placesSet.size === previousPlacesSize) {
                console.log('\nNo new data found. Stopping iterations.');
                break;
            }

            iteration++;
        }

        console.log('\nFinal sets:');
        console.log('People:', Array.from(peopleSet));
        console.log('Places:', Array.from(placesSet));

        // Report the answer
        // await reportAnswer('LUBLIN');

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
