// Voice Chat Integration - Connects Voice Conversation System with Chat UI
// Adds voice controls and integrates with existing chatbot

// Global voice conversation instance
let voiceConversation = null;

// Initialize Voice Chat System
function initVoiceChat() {
    console.log('🎙️ Initializing Voice Chat System...');

    // Create voice conversation instance
    voiceConversation = new VoiceConversation({
        openaiApiKey: CONFIG.OPENAI_API_KEY,
        language: currentLanguage, // Use global language state

        // Callbacks for UI updates
        onTranscriptionStart: () => {
            console.log('🔄 Transcribing...');
            showVoiceStatus(
                currentLanguage === 'ar' ? 'جاري التحويل إلى نص...' : 'Transcribing...'
            );
        },

        onTranscriptionComplete: (text) => {
            console.log('✅ Transcription complete:', text);
            showVoiceStatus(
                currentLanguage === 'ar' ? 'تم التحويل بنجاح' : 'Transcription complete'
            );

            // Add user message to chat
            addMessage('user', text);

            // Add to chat history
            if (typeof chatHistory !== 'undefined') {
                chatHistory.push({
                    role: 'user',
                    content: text
                });
            }
        },

        onAIResponseStart: () => {
            console.log('🤖 Getting AI response...');
            showVoiceStatus(
                currentLanguage === 'ar' ? 'جاري الحصول على الرد...' : 'Getting response...'
            );
            showTypingIndicator();
        },

        onAIResponseComplete: (response) => {
            console.log('✅ AI response received:', response);
            removeTypingIndicator();

            // Add AI message to chat
            addMessage('assistant', response);

            // Add to chat history
            if (typeof chatHistory !== 'undefined') {
                chatHistory.push({
                    role: 'assistant',
                    content: response
                });
            }
        },

        onSpeechStart: () => {
            console.log('🔊 Speaking...');
            showVoiceStatus(
                currentLanguage === 'ar' ? 'جاري التحدث...' : 'Speaking...'
            );
            updateVoiceButtonState('speaking');
        },

        onSpeechComplete: () => {
            console.log('✅ Speech complete');
            showVoiceStatus(
                currentLanguage === 'ar' ? 'اكتمل التحدث' : 'Speech complete'
            );
            updateVoiceButtonState('idle');
        },

        onError: (error) => {
            console.error('❌ Voice error:', error);
            showVoiceStatus(
                currentLanguage === 'ar' ? `خطأ: ${error}` : `Error: ${error}`,
                'error'
            );
            updateVoiceButtonState('idle');
        }
    });

    // Add voice button to UI
    addVoiceButtonToUI();

    // Update language when user switches
    updateVoiceLanguage();

    console.log('✅ Voice Chat System ready');
}

// Add voice button to chat input area
function addVoiceButtonToUI() {
    const micBtn = document.getElementById('micBtn');

    if (!micBtn) {
        console.warn('⚠️ Mic button not found in chat UI');
        return;
    }

    // Update mic button to work with voice conversation
    micBtn.onclick = () => toggleVoiceRecording();

    // Add voice status indicator
    if (!document.getElementById('voiceStatus')) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'voiceStatus';
        statusDiv.className = 'voice-status';
        statusDiv.style.display = 'none';

        const chatInput = document.querySelector('.chat-input-container');
        if (chatInput) {
            chatInput.insertBefore(statusDiv, chatInput.firstChild);
        }
    }

    console.log('✅ Voice button added to UI');
}

// Toggle voice recording
function toggleVoiceRecording() {
    if (!voiceConversation) {
        console.error('❌ Voice conversation not initialized');
        return;
    }

    if (voiceConversation.isCurrentlyRecording()) {
        // Stop recording
        console.log('⏹️ Stopping recording...');
        voiceConversation.stopRecording();
        updateVoiceButtonState('processing');
    } else if (voiceConversation.isCurrentlySpeaking()) {
        // Stop speaking
        console.log('⏹️ Stopping speech...');
        voiceConversation.stopSpeaking();
        updateVoiceButtonState('idle');
    } else {
        // Start recording
        console.log('🎤 Starting recording...');
        voiceConversation.startRecording();
        updateVoiceButtonState('recording');
    }
}

// Update voice button visual state
function updateVoiceButtonState(state) {
    const micBtn = document.getElementById('micBtn');
    if (!micBtn) return;

    // Remove all state classes
    micBtn.classList.remove('recording', 'processing', 'speaking');

    switch (state) {
        case 'recording':
            micBtn.classList.add('recording');
            micBtn.innerHTML = '🔴'; // Recording indicator
            break;

        case 'processing':
            micBtn.classList.add('processing');
            micBtn.innerHTML = '⏳'; // Processing indicator
            break;

        case 'speaking':
            micBtn.classList.add('speaking');
            micBtn.innerHTML = '🔊'; // Speaking indicator
            break;

        case 'idle':
        default:
            micBtn.innerHTML = '🎤'; // Default mic icon
            break;
    }
}

// Show voice status message
function showVoiceStatus(message, type = 'info') {
    const statusDiv = document.getElementById('voiceStatus');
    if (!statusDiv) return;

    statusDiv.textContent = message;
    statusDiv.className = `voice-status ${type}`;
    statusDiv.style.display = 'block';

    // Auto-hide after 3 seconds (except for errors)
    if (type !== 'error') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}

// Update voice conversation language when user switches
function updateVoiceLanguage() {
    if (!voiceConversation) return;

    voiceConversation.setLanguage(currentLanguage);
    console.log(`🌐 Voice language updated to: ${currentLanguage}`);
}

// Integrate with existing language toggle
const originalToggleLanguage = window.toggleLanguage;
if (typeof originalToggleLanguage === 'function') {
    window.toggleLanguage = function() {
        originalToggleLanguage();
        updateVoiceLanguage();
    };
}

// Enhanced AI Response Function (Integrates with existing chat)
async function getVoiceAIResponse(userMessage) {
    try {
        // Use existing chat system if available
        if (typeof chatHistory !== 'undefined' && typeof getAIResponse === 'function') {
            // Add user message to history
            chatHistory.push({
                role: 'user',
                content: userMessage
            });

            // Get AI response using existing function
            await getAIResponse();

            // Return the last assistant message
            const lastMessage = chatHistory[chatHistory.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
                return lastMessage.content;
            }
        }

        // Fallback: Direct API call
        const response = await fetch(`${CONFIG.OPENAI_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.MODELS.CHAT,
                messages: [
                    {
                        role: 'system',
                        content: CONFIG.PROMPTS.CHAT_SYSTEM
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                temperature: 0.7,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error('❌ AI response error:', error);
        throw error;
    }
}

// Override AI response method in VoiceConversation
if (voiceConversation) {
    voiceConversation.getAIResponse = getVoiceAIResponse;
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on chat page
    const chatPage = document.getElementById('chatPage');
    if (chatPage) {
        initVoiceChat();
    }
});

// Make functions globally available
window.initVoiceChat = initVoiceChat;
window.toggleVoiceRecording = toggleVoiceRecording;
window.updateVoiceLanguage = updateVoiceLanguage;
