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
  // Models to try in order — if primary fails, fallback kicks in
  const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

  for (const model of MODELS) {
    try {
      console.log(`Trying model: ${model}`);
      const result = await callGeminiAPIWithRetry(prompt, apiKey, model);
      return result;
    } catch (err) {
      console.error(`Model ${model} failed:`, err.message);

      // Don't try fallback for client-side errors (bad key, rate limit)
      if (err.retryable === false) {
        throw err;
      }

      // If this isn't the last model, try the next one
      if (model !== MODELS[MODELS.length - 1]) {
        console.log(`Falling back to next model...`);
        continue;
      }
      throw err;
    }
  }
}

async function callGeminiAPIWithRetry(prompt, apiKey, model) {
  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await callGeminiAPI(prompt, apiKey, model);
      return result;
    } catch (err) {
      console.error(`Attempt ${attempt}/${MAX_RETRIES} for ${model}:`, err.message);

      if (err.retryable === false || attempt === MAX_RETRIES) {
        throw err;
      }

      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }
}

async function callGeminiAPI(prompt, apiKey, model) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  // Build request body — disable thinking for 2.5 models to prevent 503 timeouts
  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192
    }
  };

  // Disable "thinking" mode for gemini-2.5 models — it wastes server budget
  // and causes frequent 503 errors on the free tier
  if (model.includes('2.5')) {
    requestBody.generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
  } catch (networkErr) {
    const err = new Error("Network error. Please check your internet connection and try again.");
    err.retryable = true;
    throw err;
  }

  if (!response.ok) {
    const status = response.status;
    let errorBody = '';
    try {
      const errorData = await response.json();
      errorBody = errorData.error?.message || JSON.stringify(errorData);
    } catch (_) {
      errorBody = await response.text().catch(() => 'Unknown error');
    }

    if (status === 429) {
      const err = new Error("Rate limit exceeded! Please wait 60 seconds before trying again.");
      err.retryable = false;
      throw err;
    } else if (status === 400) {
      // Could be an unsupported param for this model — let fallback handle it
      const err = new Error(`Bad request (${model}): ${errorBody}`);
      err.retryable = true;
      throw err;
    } else if (status === 403) {
      const err = new Error("Invalid or expired API key. Please check your Gemini API key in the extension popup.");
      err.retryable = false;
      throw err;
    } else if (status === 404) {
      const err = new Error(`Model "${model}" is not available. Trying fallback...`);
      err.retryable = true;
      throw err;
    } else if (status >= 500) {
      const err = new Error(`Server error (${status}) on ${model}. Retrying...`);
      err.retryable = true;
      throw err;
    } else {
      const err = new Error(`Unexpected error (${status}): ${errorBody}`);
      err.retryable = false;
      throw err;
    }
  }

  const data = await response.json();

  // Extract text — skip "thinking" parts from Gemini 2.5
  const parts = data.candidates?.[0]?.content?.parts || [];
  let textResponse = '';
  for (const part of parts) {
    if (part.text && !part.thought) {
      textResponse += part.text;
    }
  }

  // Fallback: take any text if no non-thought parts found
  if (!textResponse) {
    for (const part of parts) {
      if (part.text) {
        textResponse += part.text;
      }
    }
  }

  if (!textResponse.trim()) {
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') {
      const err = new Error("Response blocked by Google's safety filters. Try rephrasing the questions.");
      err.retryable = false;
      throw err;
    }
    const err = new Error(`Empty response from ${model}. Retrying...`);
    err.retryable = true;
    throw err;
  }
  
  return textResponse.trim();
}
