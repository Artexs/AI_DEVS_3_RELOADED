import express, { Request, Response, Application, RequestHandler } from 'express';
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { v4 as uuidv4 } from "uuid";
import type { State } from "../types/agent";
import {
    Utils,
    ImageProcessor,
    TranscribeProcessor,
    FileReader,
    OpenAIService,
    TextSplitter,
    VectorService,
    MessageManager,
    Agent,
    Logger,
    LangfuseService
} from '../index';
import { 
  downloadFilesInstruction, 
  sendAnswerToCentralaInstruction, 
  describeImageInstruction, 
  fileOperationsInstruction, 
  webInstruction 
} from './prompts/toolsInstructions/internal-index';

const state: State = {
    config: { max_steps: 10, current_step: 0, active_step: null },
    messages: [],
    tools: [
      {
        uuid: uuidv4(),
        name: "download_files",
        description: "Use this tool to download file from provided url from c3ntrala",
        instruction: downloadFilesInstruction,
        parameters: JSON.stringify({
            url: ['url of c3ntrala.ag3nts.org with file to download']
        })
      },
      {
        uuid: uuidv4(),
        name: "send_answer_to_centrala",
        description: "Use this tool to send answer to c3ntrala only if you need to contact with c3ntrala / ai_devs",
        instruction: sendAnswerToCentralaInstruction,
        parameters: JSON.stringify({
            task: "name of a task", 
            paramName: "answer",
            response: "text that will be send in above 'answer' param",
            url: 'verify'
        })
      },
      {
        uuid: uuidv4(),
        name: "describe_image",
        description: "Use this tool to analyze images and extract text or provide descriptions when text extraction is not possible",
        instruction: describeImageInstruction,
        parameters: JSON.stringify({
            filePath: "path to the image", 
            context: "any information that can help with detecting text on image, that can make context or suggest key points"
        })
      },
      {
        uuid: uuidv4(),
        name: "file_operations",
        description: "Use this tool to list directories/files or read file contents from the file system",
        instruction: fileOperationsInstruction,
        parameters: JSON.stringify({
            operation: "list or read",
            path: "relative path from project root"
        })
      },
      {
        uuid: uuidv4(),
        name: "web_search",
        description: "Use this to search the web for external information",
        instruction: webInstruction,
        parameters: JSON.stringify({
          query: `Command to the web search tool, including the search query and all important details, keywords and urls from the avilable context`
        }),
      },
      {
        uuid: uuidv4(),
        name: "final_answer",
        description: "Use this tool to write a message to the user",
        instruction: "...",
        parameters: JSON.stringify({"answer": "detailed response"}),
      },
    ],
    documents: [],
    actions: [],
  };

export async function runAgent(messages: ChatCompletionMessageParam[], conversation_uuid: string) {
    const logger = new Logger('agent');
    const langfuse = new LangfuseService();
    const agent = new Agent(state, logger, langfuse);
    const currentDate = new Date().toISOString().split('T')[0];
    await langfuse.generateTrace(`agent---${currentDate}`, conversation_uuid);

    state.messages =
      messages.length === 1 ? [...state.messages, ...messages.filter((m: ChatCompletionMessageParam) => m.role !== "system")] : messages.filter((m: ChatCompletionMessageParam) => m.role !== "system");
  
    for (let i = 0; i < state.config.max_steps; i++) {
      // Make a plan  
      const nextMove = await agent.plan();
      await logger.log(`RUN_AGENT___PLAN ---- Thinking... ${JSON.stringify(nextMove)}`);
      console.log('Thinking...', nextMove._thinking);
      console.table([{
        Tool: nextMove.tool,
        Query: nextMove.query
      }]);
      // If there's no tool to use, we're done
      if (!nextMove.tool || nextMove.tool === "final_answer") break;
      // Set the active step
      state.config.active_step = { name: nextMove.tool, query: nextMove.query };
      const parameters = await agent.describe(nextMove.tool, nextMove.query);
      const contextDocs = await agent.getContext(nextMove, parameters);
      await agent.useTool(nextMove.tool, { ...parameters, contextDocs }, conversation_uuid);
  
      state.config.current_step++;
    }
  
    // Generate the answer
    const answer = await agent.generateAnswer();
    state.messages = [...state.messages, answer as unknown as ChatCompletionMessageParam];  //////// TODO: change it, unify to the same property type
    await logger.log(`ODPOWIEDZ +++ ${answer}`)
    await langfuse.finalizeTrace(state.messages);
    return answer;
}

const messageManager = new MessageManager();
messageManager.addMessage('user', 
  'wczytaj plik /data/agent/notatki_rafala.txt oraz pytania z centrali z: *   Listę pytań (JSON): https://c3ntrala.ag3nts.org/data/TUTAJ-KLUCZ/notes.json');
    // `wczytaj plik /data/agent/extracted_text.txt. użyj zawartości tego pliku jako kontekst przy odczytywaniu tekstu z następującego obrazu.
    // ..../data/S04/E05/page19.png. Zwróć mi pełny i dokładny tekst, który się tam znajduje.`);
// messageManager.addMessage('user',
// `
// Twoim zadaniem jest rozwiązanie poniższego zadania. Gdy już posiadasz odpowiedź, wyślij ją do centrali. Poniżej masz instrukcję / wskazówki które mogą się przydać podczas rozwiązywania zadania. użyj 'send_answer_to_centrala' tool żeby wysłać wiadomość do centrali z przygotowanymi danymi. Zwróć uwagę, że to narzędzie wymaga podania nazwy taska, oraz nazwy parametru wraz z odpowiedzią 'answer: ......", zwróć uwagę, aby podać poprawny url do tego narzędzia.
// Generowana odpowiedź MUSI być identyczna z otrzymaną z pliku cenzura.txt, jedynie z podmienionymi wartościami.
// Dopiero gdy otrzymasz odpowiedź z centrali to zadanie będzie zakończone
// ------
//  Pobierz dane z pliku:

// https://c3ntrala.ag3nts.org/data/KLUCZ/cenzura.txt

// a następnie ocenzuruj imię i nazwisko, wiek, miasto i ulicę z numerem domu tak, aby zastąpić je słowem CENZURA. Odpowiedź wyślij do:

// https://c3ntrala.ag3nts.org/report 

// w formacie, który znasz już z poligonu. Jeśli potrzebujesz pomocy, zbadaj nagłówki HTTP wysyłane razem z plikiem TXT. Uwaga! Dane w pliku TXT zmieniają się co 60 sekund i mogą być różne dla każdego z agentów w tej samej chwili. Nazwa zadania w API to "CENZURA". 

// Co trzeba zrobić w zadaniu?

// Pobierz dane z pliku 'cenzura.txt'

// Plik znajduje się pod adresem: 'https://c3ntrala.ag3nts.org/data/KLUCZ/cenzura.txt'. Plik zawiera dane osobowe w formacie tekstowym (np. "Osoba podejrzana to Jan Nowak. Adres: Wrocław, ul. Szeroka 18. Wiek: 32 lata."). Dane w pliku zmieniają się co 60 sekund, więc pobieraj plik przed każdym wysłaniem odpowiedzi.

// Ocenzuruj dane osobowe

// Zamień następujące informacje na słowo "CENZURA":
//     *   Imię i nazwisko (razem, np. "Jan Nowak" -> "CENZURA").
//     *   Wiek (np. "32" -> "CENZURA").
//     *   Miasto (np. "Wrocław" -> "CENZURA").
//     *   Ulica i numer domu (razem, np. "ul. Szeroka 18" -> "ul. CENZURA").

// Zachowaj oryginalny format tekstu (kropki, przecinki, spacje). Nie wolno Ci przeredagowywać tekstu.

// Wyślij ocenzurowane dane do API

// Wyślij ocenzurowany tekst do API pod adresem: 'https://c3ntrala.ag3nts.org/report' w formacie JSON jako POST. Przykładowy payload:

// {
//   "task": "CENZURA",
//   "apikey": "YOUR_API_KEY",
//   "answer": "Osoba podejrzana to CENZURA. Adres: CENZURA, ul. CENZURA. Wiek: CENZURA lata."
// }

// Pamiętaj, aby zamiast 'YOUR_API_KEY' wstawić swój klucz API. Upewnij się że wysyłasz dane zakodowane w UTF-8.


// Wskazówki:

// Skup się na odpowiednim sformułowaniu promptu dla LLM. Model powinien cenzurować tylko wrażliwe dane i zachowywać oryginalny format tekstu.

// Uważaj na częste błędy:
// Cenzurowanie imienia i nazwiska oddzielnie ("CENZURA CENZURA" zamiast "CENZURA").
// Cenzurowanie ulicy i numeru domu oddzielnie ("CENZURA CENZURA" zamiast "CENZURA").
// Pamiętaj, że dane w pliku 'cenzura.txt' zmieniają się co 60 sekund.
// Zwróć uwagę na nagłówki HTTP wysyłane razem z plikiem TXT jeśli potrzebujesz dodatkowych informacji.
// Jeśli masz problemy, spróbuj użyć mocniejszego modelu językowego (np. GPT-4.1).
// Nazwa zadania w API to 'CENZURA'.
// `);
// messageManager.addMessage('user', `
// Oto dane, na których pracujemy:
// https://c3ntrala.ag3nts.org/data/TUTAJ-KLUCZ/phone_questions.json
// podaj mi listę pytań tam znajdujących się.
// jako odpowiedź, zwróć listę pytań, każde w osobnej linii.
// `)
const messages = messageManager.getMessages();
runAgent(messages, uuidv4()).catch(console.error)






// export const startApi = async () => {
//     const app = express();
//     const port = process.env.PORT || 3000;
    
//     // Initialize services
//     const langfuse = new LangfuseService('META_PROMPT_GENERATOR');
//     const messageManager = new MessageManager();
    
//     // Initialize system prompt and trace
//     const systemPrompt = await langfuse.getCompiledPrompt();
//     messageManager.addMessage('system', systemPrompt);
    
//     // Middleware for JSON parsing
//     app.use(express.json());

//     // Define routes
//     const getHandler: RequestHandler = (_req: Request, res: Response) => {
//         console.log('🔵 Hello World');
//         res.send('🔵 Hello World');
//     };

//     const postHandler: RequestHandler = async (req: Request, res: Response, next: Function) => {
//         try {
//             await langfuse.generateTrace();
//             messageManager.addMessage('user', req.body.message);

//             // Get response from LLM using Langfuse
//             const response = await langfuse.llmRequest(
//                 messageManager.getMessages(),
//                 'mini'
//             );

//             messageManager.addMessage('assistant', response);

//             // Finalize trace with all messages
//             await langfuse.finalizeTrace(messageManager.getMessages());

//             const assistantMessages = messageManager.getMessages().filter(msg => msg.role === 'assistant');
//             console.log("Number of assistant responses:", assistantMessages.length);
//             res.json({
//                 response
//             });
//         } catch (error) {
//             console.error('Error processing chat:', error);
//             res.status(500).json({ error: 'Internal server error' });
//         }
//     };

//     app.get('', getHandler);
//     app.post('', postHandler);

//     // Start server
//     app.listen(port, () => {
//         console.log(`🚀 Server is running on port ${port}`);
//     });
// };

// startApi().catch(console.error);
