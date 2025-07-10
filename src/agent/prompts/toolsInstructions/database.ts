export const databaseInstruction = `Search and retrieve data from a database by providing a concise list of relevant keywords.

<rules>
- Extract the most important keywords from the user's request
- Return a list of 5-15 keywords that best describe the search intent
- Do not generate SQL or natural language queries
- Only provide keywords, not full sentences
- Always handle errors gracefully and return helpful error messages
</rules>
return json object with single property - keyword. which is array of strings

<examples>
User: Find all users registered after 2022-01-01
AI: {"keywords": ["users", "registration", "after 2022-01-01"]}

User: Get the total sales for March 2024
AI: {"keywords": ["sales", "total", "March 2024"]}

User: List all products in the 'electronics' category
AI: {"keywords": ["products", "electronics", "category"]}
</examples>
`; 