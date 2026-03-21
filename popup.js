document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-btn');
  const removeBtn = document.getElementById('remove-btn');
  const statusEl = document.getElementById('status');

  // Load the existing API key
  chrome.storage.local.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
  });

  // Save the API key securely
  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter a valid API key.', '#ef4444');
      return;
    }

    chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
      showStatus('✓ API Key saved successfully!', '#10b981');
    });
  });

  // Remove the API key entirely from local storage
  removeBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['geminiApiKey'], () => {
      apiKeyInput.value = '';
      showStatus('API Key completely removed.', '#64748b');
    });
  });

  function showStatus(message, color) {
    statusEl.textContent = message;
    statusEl.style.color = color;
    
    setTimeout(() => {
      statusEl.textContent = '';
    }, 4000);
  }
});
