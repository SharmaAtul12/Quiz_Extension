/**
 * AI Form Helper - Parser Module
 * 
 * Uses structural and ARIA attribute traversal instead of brittle class names 
 * to remain resilient against Google Forms DOM changes.
 */

window.FormParser = {
  /**
   * Identifies all question blocks on the page.
   * Google Forms conventionally wraps each section/question inside `role="listitem"`.
   * @returns {Element[]} Array of DOM elements representing question blocks
   */
  getQuestionBlocks() {
    const blocks = Array.from(document.querySelectorAll('div[role="listitem"]'));
    return blocks.filter(block => {
      // Ensure it's a question block by verifying it has a heading and input elements
      const hasHeading = block.querySelector('[role="heading"]');
      const hasInputs = block.querySelector('input, textarea, [role="radio"], [role="checkbox"], [role="option"], [role="listbox"]');
      
      return hasHeading && hasInputs;
    });
  },

  /**
   * Extracts structural data from a given question block.
   * @param {Element} block - The question container DOM element
   * @returns {Object} Extracted data
   */
  parseQuestionBlock(block) {
    // 1. Extract Question Text
    let questionText = "Unknown Question";
    const headingEl = block.querySelector('[role="heading"]');
    if (headingEl) {
      // Extract visible text
      questionText = headingEl.innerText || headingEl.textContent || "";
      // Clean up common artifacts, e.g., the trailing '*' for required questions
      questionText = questionText.replace(/\s*\*\s*$/, '').trim();
    }

    // 2. Determine Question Type and Extract Options
    let type = "unknown";
    let options = [];

    // Semantic Traversal for Radio Buttons (MCQ)
    const radios = Array.from(block.querySelectorAll('[role="radio"]'));
    if (radios.length > 0) {
      type = "mcq";
      options = radios.map(r => this._extractLabelText(r)).filter(Boolean);
    } 
    // Semantic Traversal for Checkboxes
    else if (block.querySelectorAll('[role="checkbox"]').length > 0) {
      const checkboxes = Array.from(block.querySelectorAll('[role="checkbox"]'));
      type = "checkbox";
      options = checkboxes.map(c => this._extractLabelText(c)).filter(Boolean);
    }
    // Semantic Traversal for Dropdowns
    else if (block.querySelectorAll('[role="listbox"]').length > 0 || block.querySelectorAll('[role="option"]').length > 0) {
      const listboxOptions = Array.from(block.querySelectorAll('[role="option"]'));
      type = "mcq"; // Treat dropdowns functionally like MCQs
      // Typically the first item is "Choose", which lacks a value or has an empty aria-label, filter it if needed.
      options = listboxOptions.map(o => this._extractLabelText(o))
                              .filter(text => text && text.toLowerCase() !== "choose");
    }
    // Traversal for Text Inputs
    else if (block.querySelectorAll('input[type="text"]').length > 0 || block.querySelectorAll('input:not([type="hidden"])').length > 0) {
      type = "short";
    }
    // Traversal for Textareas
    else if (block.querySelectorAll('textarea').length > 0) {
      type = "paragraph";
    }
    // Fallback logic for basic HTML forms embedded or structurally different ones
    else {
      type = this._fallbackParseTypeMap(block, options);
    }

    return {
      question: questionText,
      type: type,
      options: options
    };
  },

  /**
   * Helper to retrieve text from ARIA labels, inner text, or nearby elements.
   * @param {Element} el - The semantic element (e.g., role=radio)
   * @private
   */
  _extractLabelText(el) {
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim().length > 0) {
      return ariaLabel.trim();
    }
    
    // In many forms, the semantic element might hold the text inside it or slightly adjacent.
    const text = el.innerText || el.textContent;
    if (text && text.trim().length > 0) {
      return text.trim();
    }
    return null;
  },

  /**
   * Fallback for mapping standard HTML input types if ARIA roles are missing.
   * @private
   */
  _fallbackParseTypeMap(block, optionsRef) {
    const standardRadios = Array.from(block.querySelectorAll('input[type="radio"]'));
    if (standardRadios.length > 0) {
      standardRadios.forEach(r => {
        const label = block.querySelector(`label[for="${r.id}"]`);
        optionsRef.push(label ? label.innerText.trim() : r.value);
      });
      return "mcq";
    }
    
    const standardCheckboxes = Array.from(block.querySelectorAll('input[type="checkbox"]'));
    if (standardCheckboxes.length > 0) {
      standardCheckboxes.forEach(c => {
        const label = block.querySelector(`label[for="${c.id}"]`);
        optionsRef.push(label ? label.innerText.trim() : c.value);
      });
      return "checkbox";
    }

    return "unknown";
  }
};
