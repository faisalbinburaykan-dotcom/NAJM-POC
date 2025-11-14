// Voice Conversation System - Two-Way Voice Chat with AI
// Supports: Arabic & English | Groq Whisper STT | OpenAI TTS

class VoiceConversation {
    constructor(config) {
        this.openaiApiKey = config.openaiApiKey;
        this.language = config.language || 'ar'; // 'ar' or 'en'
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isSpeaking = false;
        this.audioContext = null;
        this.currentAudio = null;

        // Callbacks
        this.onTranscriptionStart = config.onTranscriptionStart || (() => {});
        this.onTranscriptionComplete = config.onTranscriptionComplete || (() => {});
        this.onAIResponseStart = config.onAIResponseStart || (() => {});
        this.onAIResponseComplete = config.onAIResponseComplete || (() => {});
        this.onSpeechStart = config.onSpeechStart || (() => {});
        this.onSpeechComplete = config.onSpeechComplete || (() => {});
        this.onError = config.onError || ((error) => console.error(error));
    }

    // ============================================
    // 1. VOICE RECORDING
    // ============================================

    /**
     * Start recording voice from microphone
     */
    async startRecording() {
        if (this.isRecording) {
            console.warn('Already recording');
            return;
        }

        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];
            this.isRecording = true;

            // Collect audio data
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            // When recording stops, process the audio
            this.mediaRecorder.onstop = async () => {
                console.log('🎤 Recording stopped, processing audio...');
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());

                // Start the full conversation flow
                await this.processVoiceConversation(audioBlob);
            };

            // Start recording
            this.mediaRecorder.start();
            console.log('🎤 Recording started...');

        } catch (error) {
            console.error('❌ Failed to start recording:', error);
            this.onError('Failed to access microphone: ' + error.message);
            this.isRecording = false;
        }
    }

    /**
     * Stop recording voice
     */
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            console.warn('Not recording');
            return;
        }

        console.log('⏹️ Stopping recording...');
        this.isRecording = false;
        this.mediaRecorder.stop();
    }

    // ============================================
    // 2. SPEECH-TO-TEXT (Groq Whisper)
    // ============================================

    /**
     * Transcribe audio using OpenAI Whisper API
     * @param {Blob} audioBlob - Audio blob to transcribe
     * @returns {Promise<string>} Transcribed text
     */
    async transcribeAudio(audioBlob) {
        console.log('🔄 Transcribing audio with OpenAI Whisper...');
        this.onTranscriptionStart();

        try {
            // Convert webm to format Whisper expects
            const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

            // Prepare form data
            const formData = new FormData();
            formData.append('file', audioFile);
            formData.append('model', 'whisper-1');
            formData.append('language', this.language); // ar or en
            formData.append('response_format', 'json');

            // Call OpenAI Whisper API
            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI Whisper API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const transcription = data.text;

            console.log('✅ Transcription:', transcription);
            this.onTranscriptionComplete(transcription);

            return transcription;

        } catch (error) {
            console.error('❌ Transcription failed:', error);
            this.onError('Transcription failed: ' + error.message);
            throw error;
        }
    }

    // ============================================
    // 3. GET AI RESPONSE (Your existing AI)
    // ============================================

    /**
     * Get AI response from your existing chatbot
     * This should integrate with your existing AI system (GPT/Claude)
     * @param {string} userMessage - User's transcribed message
     * @returns {Promise<string>} AI response text
     */
    async getAIResponse(userMessage) {
        console.log('🤖 Getting AI response...');
        this.onAIResponseStart();

        try {
            // This should integrate with your existing chat system
            // For now, I'll show how to call OpenAI GPT-4

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiApiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: this.language === 'ar'
                                ? 'أنت مساعد نجم الذكي. ساعد المستخدم في تقديم بلاغ الحادث بطريقة ودية ومهنية.'
                                : 'You are Najm AI Assistant. Help the user file an accident report in a friendly and professional manner.'
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
                const errorText = await response.text();
                throw new Error(`AI API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;

            console.log('✅ AI Response:', aiResponse);
            this.onAIResponseComplete(aiResponse);

            return aiResponse;

        } catch (error) {
            console.error('❌ AI response failed:', error);
            this.onError('AI response failed: ' + error.message);
            throw error;
        }
    }

    // ============================================
    // 4. TEXT-TO-SPEECH (OpenAI TTS)
    // ============================================

    /**
     * Convert text to speech and play it
     * @param {string} text - Text to convert to speech
     */
    async textToSpeech(text) {
        console.log('🔊 Converting text to speech...');
        this.onSpeechStart();

        try {
            // Stop any currently playing audio
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }

            // Select voice based on language
            const voice = this.language === 'ar' ? 'alloy' : 'nova'; // OpenAI TTS voices

            // Call OpenAI TTS API
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiApiKey}`
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice: voice,
                    response_format: 'mp3',
                    speed: 1.0
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`TTS API error: ${response.status} - ${errorText}`);
            }

            // Get audio blob
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            // Play the audio
            this.currentAudio = new Audio(audioUrl);

            this.currentAudio.onended = () => {
                console.log('✅ Speech playback complete');
                this.isSpeaking = false;
                this.onSpeechComplete();
                URL.revokeObjectURL(audioUrl);
            };

            this.currentAudio.onerror = (error) => {
                console.error('❌ Audio playback error:', error);
                this.isSpeaking = false;
                this.onError('Audio playback failed');
            };

            this.isSpeaking = true;
            await this.currentAudio.play();
            console.log('🔊 Playing AI response...');

        } catch (error) {
            console.error('❌ TTS failed:', error);
            this.isSpeaking = false;
            this.onError('Text-to-speech failed: ' + error.message);
            throw error;
        }
    }

    // ============================================
    // 5. COMPLETE CONVERSATION FLOW
    // ============================================

    /**
     * Process complete voice conversation:
     * Audio → STT → AI Response → TTS
     * @param {Blob} audioBlob - Recorded audio
     */
    async processVoiceConversation(audioBlob) {
        try {
            // Step 1: Transcribe voice to text (Groq Whisper)
            const userMessage = await this.transcribeAudio(audioBlob);

            if (!userMessage || userMessage.trim().length === 0) {
                this.onError('No speech detected. Please try again.');
                return;
            }

            // Step 2: Get AI response
            const aiResponse = await this.getAIResponse(userMessage);

            // Step 3: Convert AI response to speech and play
            await this.textToSpeech(aiResponse);

        } catch (error) {
            console.error('❌ Voice conversation failed:', error);
            this.onError('Voice conversation failed: ' + error.message);
        }
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Stop any currently playing speech
     */
    stopSpeaking() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
            this.isSpeaking = false;
            console.log('⏹️ Speech stopped');
        }
    }

    /**
     * Change language for voice conversation
     * @param {string} lang - 'ar' or 'en'
     */
    setLanguage(lang) {
        this.language = lang;
        console.log(`🌐 Language set to: ${lang}`);
    }

    /**
     * Check if currently recording
     */
    isCurrentlyRecording() {
        return this.isRecording;
    }

    /**
     * Check if currently speaking
     */
    isCurrentlySpeaking() {
        return this.isSpeaking;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.stopRecording();
        this.stopSpeaking();

        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Export for use in other scripts
window.VoiceConversation = VoiceConversation;
