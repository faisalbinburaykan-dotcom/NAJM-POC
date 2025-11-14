// Voice Recording and Speech-to-Text

let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let isRecording = false;

async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        // IMPORTANT: Stop any playing TTS immediately when mic is pressed
        if (typeof window.elevenLabsTTS !== 'undefined') {
            window.elevenLabsTTS.stopAudio();
            console.log('🔇 Stopped TTS playback');
        }

        // Enable voice mode globally (for LLM-driven flow)
        voiceEnabled = true;
        console.log('🎤 Voice mode enabled');

        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Create media recorder
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        recordingSeconds = 0;

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());

            // Create audio blob
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

            // Convert to text
            await transcribeAudio(audioBlob);
        };

        // Start recording
        mediaRecorder.start();
        isRecording = true;

        // Update UI
        updateRecordingUI(true);

        // Start timer
        startRecordingTimer();

    } catch (error) {
        console.error('Error starting recording:', error);
        alert(currentLanguage === 'ar'
            ? 'عذراً، لم نتمكن من الوصول إلى الميكروفون. يرجى التحقق من الأذونات.'
            : 'Sorry, we couldn\'t access the microphone. Please check permissions.');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;

        // Update UI
        updateRecordingUI(false);

        // Stop timer
        stopRecordingTimer();
    }
}

function updateRecordingUI(recording) {
    const micBtn = document.getElementById('micBtn');
    const recordingIndicator = document.getElementById('recordingIndicator');

    if (recording) {
        micBtn.classList.add('recording');
        recordingIndicator.style.display = 'flex';
    } else {
        micBtn.classList.remove('recording');
        recordingIndicator.style.display = 'none';
    }
}

function startRecordingTimer() {
    recordingSeconds = 0;
    updateTimerDisplay();

    recordingTimer = setInterval(() => {
        recordingSeconds++;
        updateTimerDisplay();

        // Auto-stop after 60 seconds
        if (recordingSeconds >= 60) {
            stopRecording();
        }
    }, 1000);
}

function stopRecordingTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('recordingTime');
    const minutes = Math.floor(recordingSeconds / 60);
    const seconds = recordingSeconds % 60;
    timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function transcribeAudio(audioBlob) {
    if (!validateConfig()) {
        addMessage('system', currentLanguage === 'ar'
            ? '⚠️ يرجى تكوين مفتاح OpenAI API في config.js'
            : '⚠️ Please configure OpenAI API key in config.js');
        return;
    }

    // Show processing message
    const processingText = currentLanguage === 'ar'
        ? '🎤 جاري تحويل الصوت إلى نص...'
        : '🎤 Converting speech to text...';
    addMessage('system', processingText);

    try {
        // Convert webm to a format Whisper accepts (we'll send as is, Whisper supports webm)
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', CONFIG.MODELS.WHISPER);
        formData.append('language', currentLanguage === 'ar' ? 'ar' : 'en');

        const response = await fetch(`${CONFIG.OPENAI_API_URL}/audio/transcriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Whisper API Error: ${response.status}`);
        }

        const data = await response.json();
        const transcribedText = data.text;

        if (transcribedText && transcribedText.trim()) {
            // Add transcribed text as user message
            addMessage('user', transcribedText);

            // Add to chat history
            chatHistory.push({
                role: 'user',
                content: transcribedText
            });

            // Get LLM response (LLM-driven flow)
            await getAIResponse();

        } else {
            addMessage('system', currentLanguage === 'ar'
                ? '❌ لم نتمكن من فهم الصوت. يرجى المحاولة مرة أخرى.'
                : '❌ Couldn\'t understand the audio. Please try again.');
        }

    } catch (error) {
        console.error('Error transcribing audio:', error);
        addMessage('system', currentLanguage === 'ar'
            ? '❌ عذراً، حدث خطأ في تحويل الصوت. يرجى المحاولة مرة أخرى.'
            : '❌ Sorry, an error occurred during transcription. Please try again.');
    }
}

// Text-to-Speech (Optional enhancement)
async function speakText(text) {
    // Using Web Speech API (built-in browser feature)
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
    }
}

// Alternative: OpenAI TTS (premium feature)
async function speakWithOpenAI(text) {
    if (!validateConfig()) return;

    try {
        const response = await fetch(`${CONFIG.OPENAI_API_URL}/audio/speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.MODELS.TTS,
                input: text,
                voice: 'alloy',
                speed: 1.0
            })
        });

        if (!response.ok) {
            throw new Error(`TTS API Error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();

    } catch (error) {
        console.error('Error with TTS:', error);
        // Fallback to browser TTS
        speakText(text);
    }
}
