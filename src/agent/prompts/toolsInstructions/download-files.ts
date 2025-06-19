export const downloadFilesInstruction = `Extract all URLs from the provided text, ensuring accurate and complete URL identification.

<rules>
- Extract only valid URLs that follow standard URL format
- Include both http and https protocols
- Preserve the exact URL as found in the text
- Handle URLs with or without www prefix
- Include URLs with query parameters and fragments
- Exclude partial or malformed URLs
- Return URLs in their original form without modification
- Handle URLs with special characters and encoding
- Consider both absolute and relative URLs
- Validate URL structure before extraction
</rules>

<examples>
User: Check out https://example.com and http://test.com/page?q=123
AI: {"url": ["https://example.com", "http://test.com/page?q=123"]}

User: Visit our site at www.website.com and docs.website.com/api
AI: {"url": ["www.website.com", "docs.website.com/api"]}

User: The API endpoint is https://api.service.com/v1/users#section
AI: {"url": ["https://api.service.com/v1/users"]}

User: Links: example.com/path and https://secure.site.com
AI: {"url": ["example.com/path", "https://secure.site.com"]}
</examples>`