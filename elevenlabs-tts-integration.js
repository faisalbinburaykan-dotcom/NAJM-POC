/**
 * ElevenLabs TTS Integration
 * Replaces OpenAI TTS with ElevenLabs + Groq Whisper STT
 */

const CONVERSATION_SERVER = window.conversationState?.SERVER_URL || 'http://13.51.235.197:3000';

// ============================================
// TEXT-TO-SPEECH (ElevenLabs)
// ============================================

/**
 * Convert text to speech using ElevenLabs via server
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code ('ar' or 'en')
 * @returns {Promise<string>} Audio data URL
 */
async function textToSpeech(text, language = 'ar') {
    try {
        console.log(`🔊 TTS Request: "${text.substring(0, 50)}..."`);

        const response = await fetch(`${CONVERSATION_SERVER}/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                language: language
            })
        });

        if (!response.ok) {
            throw new Error(`TTS request failed: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'TTS generation failed');
        }

        console.log('✅ TTS audio generated');
        return result.audio; // Returns base64 data URL

    } catch (error) {
        console.error('❌ TTS Error:', error);
        throw error;
    }
}

// Store current audio object for stopping
let currentAudio = null;

/**
 * Play audio from data URL
 * @param {string} audioDataUrl - Audio data URL
 * @returns {Promise<void>}
 */
function playAudio(audioDataUrl) {
    return new Promise((resolve, reject) => {
        // Stop any currently playing audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        const audio = new Audio(audioDataUrl);
        currentAudio = audio;

        audio.onended = () => {
            console.log('✅ Audio playback completed');
            currentAudio = null;
            resolve();
        };

        audio.onerror = (error) => {
            console.error('❌ Audio playback error:', error);
            currentAudio = null;
            reject(error);
        };

        audio.play().catch(reject);
    });
}

/**
 * Stop any currently playing audio
 */
function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
        console.log('🔇 Audio stopped');
    }
}

/**
 * Generate and play TTS for assistant messages
 * @param {string} text - Text to speak
 * @param {string} language - Language code
 * @returns {Promise<void>}
 */
async function speakAssistantMessage(text, language = 'ar') {
    try {
        // Generate TTS audio
        const audioDataUrl = await textToSpeech(text, language);

        // Play audio
        await playAudio(audioDataUrl);

    } catch (error) {
        console.error('❌ Failed to speak message:', error);
        // Don't throw - just log error and continue without audio
    }
}

// ============================================
// SPEECH-TO-TEXT (Groq Whisper)
// ============================================

/**
 * Convert speech to text using Groq Whisper via server
 * @param {Blob} audioBlob - Audio blob to transcribe
 * @param {string} language - Language code ('ar' or 'en')
 * @returns {Promise<string>} Transcription text
 */
async function speechToText(audioBlob, language = 'ar') {
    try {
        console.log('🎤 STT Request: Processing audio...');

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('language', language);

        const response = await fetch(`${CONVERSATION_SERVER}/stt`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`STT request failed: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'STT transcription failed');
        }

        console.log(`✅ STT transcription: "${result.transcription}"`);
        return result.transcription;

    } catch (error) {
        console.error('❌ STT Error:', error);
        throw error;
    }
}

// ============================================
// INTEGRATION WITH EXISTING VOICE SYSTEM
// ============================================

/**
 * Override existing voice conversation system to use ElevenLabs + Groq
 * This integrates with the existing voice-conversation.js
 */
function integrateWithExistingVoiceSystem() {
    // Check if VoiceConversation class exists
    if (typeof VoiceConversation !== 'undefined' && VoiceConversation.prototype) {
        console.log('🔧 Integrating ElevenLabs TTS + Groq Whisper STT...');

        // Store original methods
        const originalTranscribe = VoiceConversation.prototype.transcribeAudio;
        const originalTTS = VoiceConversation.prototype.textToSpeech;

        // Override transcribeAudio to use Groq Whisper
        VoiceConversation.prototype.transcribeAudio = async function(audioBlob) {
            try {
                // Call onTranscriptionStart callback if exists
                if (this.onTranscriptionStart) {
                    this.onTranscriptionStart();
                }

                console.log('🎤 Transcribing with Groq Whisper...');
                const transcription = await speechToText(audioBlob, this.language);

                // Call onTranscriptionComplete callback if exists
                if (this.onTranscriptionComplete) {
                    this.onTranscriptionComplete(transcription);
                }

                return transcription;

            } catch (error) {
                console.error('Transcription error:', error);
                if (this.onError) {
                    this.onError('خطأ في تحويل الصوت: ' + error.message);
                }
                throw error;
            }
        };

        // Override textToSpeech to use ElevenLabs
        VoiceConversation.prototype.textToSpeech = async function(text) {
            try {
                // Call onSpeechStart callback if exists
                if (this.onSpeechStart) {
                    this.onSpeechStart();
                }

                console.log('🔊 Speaking with ElevenLabs...');
                const audioDataUrl = await textToSpeech(text, this.language);

                // Play the audio
                await playAudio(audioDataUrl);

                // Call onSpeechComplete callback if exists
                if (this.onSpeechComplete) {
                    this.onSpeechComplete();
                }

            } catch (error) {
                console.error('TTS error:', error);
                if (this.onError) {
                    this.onError('خطأ في التحدث: ' + error.message);
                }
                throw error;
            }
        };

        console.log('✅ Voice system integration complete');
    } else {
        console.warn('⚠️ VoiceConversation class not found - will use standalone functions');
    }
}

// ============================================
// AUTO-INTEGRATION
// ============================================

// Try to integrate when this script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', integrateWithExistingVoiceSystem);
} else {
    // DOM already loaded
    integrateWithExistingVoiceSystem();
}

// Also try after a short delay to ensure other scripts have loaded
setTimeout(integrateWithExistingVoiceSystem, 1000);

// ============================================
// EXPORTS
// ============================================

// Make functions available globally
window.elevenLabsTTS = {
    textToSpeech,
    playAudio,
    stopAudio,
    speakAssistantMessage,
    speechToText,
    integrateWithExistingVoiceSystem
};

console.log('✅ ElevenLabs TTS + Groq Whisper STT integration loaded');
