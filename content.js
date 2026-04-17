/**
 * AI Form Helper - Content Script
 * Injects UI elements into Google Forms and interacts with the background script.
 */

const observer = new MutationObserver(() => {
  clearTimeout(window._formHelperTimeout);
  window._formHelperTimeout = setTimeout(() => {
    injectUI();
  }, 500);
});

observer.observe(document.body, { childList: true, subtree: true });

setTimeout(injectUI, 1000);

function injectUI() {
  if (!window.FormParser) return;
  const blocks = window.FormParser.getQuestionBlocks();

  if (blocks.length > 0) {
    injectSolveAllButton();
  }
}

function injectSolveAllButton() {
  if (document.getElementById('ai-form-helper-solve-all-container')) return;
  
  // Create an overlay to block interaction while solving
  const overlay = document.createElement('div');
  overlay.id = 'ai-form-helper-overlay';
  overlay.innerHTML = `
    <div class="ai-overlay-content">
      <div class="ai-overlay-spinner"></div>
      <span>Extracting and solving all questions...</span>
    </div>
  `;
  document.body.appendChild(overlay);
  
  const container = document.createElement('div');
  container.id = 'ai-form-helper-solve-all-container';
  
  const solveAllBtn = document.createElement('button');
  solveAllBtn.className = 'ai-form-helper-btn';
  solveAllBtn.id = 'ai-form-helper-solve-all-btn';
  solveAllBtn.innerHTML = `<svg class="ai-icon-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                           <span>Solve All Questions</span>`;

  solveAllBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    solveAllBtn.innerHTML = `<div class="ai-spinner"></div><span>Solving Batch...</span>`;
    solveAllBtn.disabled = true;
    solveAllBtn.style.filter = "grayscale(80%) opacity(0.8)";
    overlay.classList.add('active'); // Activate the blur overlay

    const blocks = window.FormParser.getQuestionBlocks();
    const questionsData = [];
    
    // Clear old existing boxed answers globally before mapping new ones
    document.querySelectorAll('.ai-form-helper-answer-box').forEach(el => el.remove());
    document.querySelectorAll('.ai-form-helper-highlight').forEach(el => el.classList.remove('ai-form-helper-highlight'));

    blocks.forEach((block) => {
      questionsData.push(window.FormParser.parseQuestionBlock(block));
    });

    if (questionsData.length === 0) {
      solveAllBtn.innerHTML = `<svg class="ai-icon-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg><span>Solve All Questions</span>`;
      solveAllBtn.disabled = false;
      solveAllBtn.style.filter = "none";
      overlay.classList.remove('active');
      return;
    }

    // Guard: check if extension context is still valid (breaks after extension reload)
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      overlay.classList.remove('active');
      solveAllBtn.innerHTML = `<svg class="ai-icon-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg><span>Solve All Questions</span>`;
      solveAllBtn.disabled = false;
      solveAllBtn.style.filter = "none";
      alert("Extension was updated. Please refresh this page (Ctrl+R) and try again.");
      return;
    }

    // Call batch endpoint securely
    chrome.runtime.sendMessage(
      { action: 'fetch_all_suggestions', questionsData },
      (response) => {
        overlay.classList.remove('active'); // Remove blur UI 

        if (chrome.runtime.lastError || (response && response.error)) {
           solveAllBtn.innerHTML = `<svg class="ai-icon-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg><span>Solve All Questions</span>`;
           solveAllBtn.disabled = false;
           solveAllBtn.style.filter = "none";
           
           const errMsg = chrome.runtime.lastError ? chrome.runtime.lastError.message : response.error;
           alert("Batch Error: " + errMsg);
           return;
        }

        // Display Success State permanently on the FAB
        solveAllBtn.innerHTML = `<svg class="ai-icon-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg><span>All Solved!</span>`;
        // Leave button disabled so they cannot press it again
        
        if (response && response.rawText) {
          // Parse numbered list response line by line safely extracting answers
          const lines = response.rawText.split('\n').map(l => l.trim()).filter(l => Boolean(l));
          const answersMap = {};
          
          lines.forEach(line => {
             const match = line.match(/^(\d+)[.)\]]?\s*(.+)$/);
             if (match) {
               const idx = parseInt(match[1]) - 1; // Convert human list to 0-based array index
               answersMap[idx] = match[2].trim();
             }
          });

          // Inject answers
          blocks.forEach((block, index) => {
             let answer = answersMap[index];
             
             // Fallback attempt if rigid numbering failed but line count matches
             if (!answer && lines[index]) {
                answer = lines[index].replace(/^\d+[.)\]]?\s*/, '').trim();
             }
             
             if (answer) {
               const box = document.createElement('div');
               box.className = 'ai-form-helper-answer-box';
               
               const header = document.createElement('div');
               header.className = 'ai-form-helper-answer-header';
               header.innerText = 'Suggested Answer';
               
               const content = document.createElement('div');
               content.innerText = answer;

               box.appendChild(header);
               box.appendChild(content);
               block.appendChild(box);
               
               const qType = questionsData[index].type;
               if (qType === 'mcq' || qType === 'checkbox') {
                 highlightCorrectOption(block, answer, qType);
               }
             }
          });
        }
      }
    );
  });

  container.appendChild(solveAllBtn);
  document.body.appendChild(container);
}

function highlightCorrectOption(block, aiAnswer, type) {
  const cleanedAnswer = aiAnswer.trim().toLowerCase();
  
  const rolesType = type === 'mcq' ? '[role="radio"], [role="option"]' : '[role="checkbox"]';
  let elements = Array.from(block.querySelectorAll(rolesType));
  
  if (elements.length === 0) {
     const inputType = type === 'mcq' ? 'radio' : 'checkbox';
     elements = Array.from(block.querySelectorAll(`input[type="${inputType}"]`));
  }

  elements.forEach(el => {
    let labelText = el.getAttribute('aria-label') || el.innerText || el.textContent;
    
    if (!labelText && el.tagName === 'INPUT') {
      const labelEl = block.querySelector(`label[for="${el.id}"]`);
      if (labelEl) labelText = labelEl.innerText || labelEl.textContent;
      else labelText = el.value;
    }

    if (labelText) {
      const cleanedLabel = labelText.trim().toLowerCase();
      
      if (cleanedAnswer === cleanedLabel || cleanedAnswer.includes(cleanedLabel)) {
        const wrapperToHighlight = el.closest('label') || el.parentElement;
        if (wrapperToHighlight) {
          wrapperToHighlight.classList.add('ai-form-helper-highlight');
        } else {
          el.classList.add('ai-form-helper-highlight');
        }
      }
    }
  });
}
