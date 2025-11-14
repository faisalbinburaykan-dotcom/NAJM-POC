/**
 * Najm Conversation Manager - DEPRECATED
 *
 * This file has been replaced by LLM-driven JSON state management.
 * The LLM now controls the entire conversation flow via JSON output.
 *
 * Keeping this file as a stub to avoid breaking imports.
 */

console.warn("⚠️ ConversationManager is disabled — using LLM JSON flow.");

// Empty stub to prevent import errors
class ConversationManager {
    constructor() {
        console.warn("ConversationManager is deprecated. Use LLM JSON state instead.");
    }
}

// Export empty stub
window.ConversationManager = ConversationManager;
window.conversationManager = null; // Explicitly set to null

console.log('✅ Conversation Manager stub loaded (LLM JSON mode active)');
