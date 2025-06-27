# Plan for CentralaService Extension

## 1. State Object
- Structure:
  - `questions`: array/object of questions (from questions.json)
  - `answers`: array/object, same keys as questions, initialized with placeholders (e.g., empty strings)
  - `currentQuestionNumber`: int, starts at 1
  - `lastCentralaAnswer`: string, starts empty

## 2. Initialization
- On class instantiation:
  - Try to load state from a hardcoded file path (e.g., `centrala_state.json`)
  - If file does not exist or is invalid:
    - Fetch questions from Centrala (`questions.json`)
    - Initialize state object as above
    - Save state to file

## 3. Private State
- Store the state object as a private property of the class

## 4. Public API
- `getCurrentQuestionInfo()`
  - Returns: `{ currentQuestionNumber, question, lastCentralaAnswer }`
- `submitAnswer(answer: string)`
  - Updates answer for current question in state
  - Sends all answers to centrala
  - Receives response, checks correctness
  - Updates `lastCentralaAnswer` and `currentQuestionNumber` as needed
  - Saves updated state to file
  - Returns:
    - If not all questions are correct: `false`/empty/undefined
    - If all correct and centrala returns flag: return flag string

## 5. Private Helpers
- `checkCentralaResponse(response)`
  - Determines if answer is correct, or which question is wrong
  - Updates state accordingly

## 6. File I/O
- All state changes are persisted to file after each update

## 7. Error Handling
- All file/network operations wrapped in try/catch
- If file is corrupted, re-initialize

## 8. Extensibility
- Design allows for easy addition of new fields or logic

---

**Next steps:**  
- Implement the above plan in `CentralaService.ts`  
- Use modern ES6+ syntax, async/await, and robust error handling  
- Use `bun` for any package management if needed
