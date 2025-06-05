export const LINK_EXTRACTION_PROMPT = `You are an AI assistant analyzing website content to find all url links, and sort them from relevant ones to completely not connected with question. Your task is to:

1. Analyze the provided website content
2. Extract ALL URLs from the content
3. Sort them by relevance to the given question:
   - First URL should be most relevant to the question
   - Middle URLs should be somewhat related
   - Last URLs should be least relevant but still present in the article
4. use _thinking as a space to gather all revelant informations 
5. Take care to provide valid url, or url suffix. Any ' '(space) is forbidden
6. while gathering urls, use url, not a text describing button

<websiteContent>
{content}
</websiteContent>

Please respond in the following JSON format, do NOT provide any other text besides below structure, also dont return 'json' word:
{
  "_thinking": "place for preparing answer in llm",
  "answer": ["most_relevant_url", "somewhat_relevant_url", "least_relevant_url"]
}
  
valid example:
{
  "_thinking": "place for preparing answer in llm",
  "answer": ["/kontakt", "https://softo.agents.org/....", "least_relevant_url"]
}

Invalid example:
{
  "_thinking": "place for preparing answer in llm",
  "answer": [
    "most_relevant_url", // some unnecessary comment
    irrelevant text, "somewhat_relevant_url", 
    "/Co oferujemy?"
  ]
}`; 