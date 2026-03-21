// Default listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetch_all_suggestions') {
    handleBatchSuggestionRequest(request.questionsData)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ error: error.message }));
    
    return true; 
  }
});

async function handleBatchSuggestionRequest(questionsData) {
  const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
  
  if (!geminiApiKey) {
    throw new Error('API Key not found. Please set your Gemini API key in the popup.');
  }

  let promptText = `You are an AI assistant designed to answer quiz questions.

Your task is to answer ALL the questions provided below.

Follow these rules strictly:

1. Answer every question.
2. Do NOT skip any question.
3. Do NOT include explanations.
4. Return answers in EXACT format.

Answer Rules:

* Multiple Choice: return EXACT option text
* Checkbox: return all correct options separated by comma
* Short Answer: return concise answer (max 5 words)
* Paragraph: return short answer (max 2 lines)

Output Format (STRICT):
Return answers in numbered format matching the question numbers:

1. <answer>
2. <answer>
3. <answer>

...

If unsure, choose the most likely correct answer.

---

Questions:

`;

  // Inject user questions format
  questionsData.forEach((q, index) => {
    const opts = (q.options && q.options.length > 0) ? q.options.join(', ') : 'None';
    promptText += `${index + 1}. Question: ${q.question}\n   Options: ${opts}\n\n`;
  });

  promptText += `---\n\nImportant:\n\n* Keep answers aligned with numbers\n* Do not add extra text\n* Do not repeat questions\n* Only output answers\n`;

  const result = await fetchGeminiCompletion(promptText, geminiApiKey);
  
  return { rawText: result };
}

async function fetchGeminiCompletion(prompt, apiKey) {
  // Using gemini-2.5-flash
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1 // Low temperature for high precision
        }
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded! Please wait 60 seconds before clicking again (Free API Tier restriction).");
      } else if (response.status === 400 || response.status === 403) {
        throw new Error("Invalid API key. Please double-check your Gemini API key in the extension's popup.");
      } else if (response.status >= 500) {
        throw new Error("Google's AI servers are currently experiencing issues. Please try again later.");
      }
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return textResponse.trim();
  } catch (err) {
    console.error('Gemini API Error:', err);
    if (err.message === "Failed to fetch") {
      throw new Error("Network error. Please check your internet connection.");
    }
    throw err;
  }
}
