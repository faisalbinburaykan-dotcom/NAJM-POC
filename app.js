// Global State
let currentLanguage = 'ar';
let chatHistory = [];
let currentTicket = null;
let currentPhase = 'greeting'; // Track current phase from LLM JSON
let ticketData = {}; // Store ticket data from LLM JSON
let voiceEnabled = false; // Track if voice is enabled
let ticketAlreadyCreated = false; // ✅ NEW: Prevent duplicate ticket creation

// Track uploaded files (for final ticket structure)
let uploadedFiles = {
    accident_photos: [],
    id_card: null,
    driving_license: null,
    vehicle_registration: null
};

// Tickets storage (in-memory)
let tickets = [];

// Header Login Button Management
function setupLoginButton() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    // Setup login button
    setupLoginButton();

    // Set initial language
    updateLanguage();

    // Add enter key listener for message input
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function startReport() {
    showPage('chatPage');
    initChat();
}

function goToLanding() {
    showPage('landingPage');
    chatHistory = [];
    currentTicket = null;
    currentPhase = 'greeting';
    ticketData = {};
    voiceEnabled = false;
    ticketAlreadyCreated = false; // ✅ Reset flag when going back to landing
    // Reset uploaded files
    uploadedFiles = {
        accident_photos: [],
        id_card: null,
        driving_license: null,
        vehicle_registration: null
    };
    document.getElementById('chatMessages').innerHTML = '';
}

function goToLogin() {
    window.location.href = 'login.html';
}

// Language Toggle
function toggleLanguage() {
    currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    updateLanguage();
}

function updateLanguage() {
    const body = document.body;
    const html = document.documentElement;
    const langBtn = document.getElementById('langToggle');

    if (currentLanguage === 'en') {
        body.classList.add('ltr');
        body.setAttribute('dir', 'ltr');
        body.setAttribute('lang', 'en');
        html.setAttribute('dir', 'ltr');
        html.setAttribute('lang', 'en');
        langBtn.textContent = 'ع';  // Arabic letter when in English mode
    } else {
        body.classList.remove('ltr');
        body.setAttribute('dir', 'rtl');
        body.setAttribute('lang', 'ar');
        html.setAttribute('dir', 'rtl');
        html.setAttribute('lang', 'ar');
        langBtn.textContent = 'EN';  // EN when in Arabic mode
    }

    // Update all translatable elements
    document.querySelectorAll('[data-ar]').forEach(el => {
        const key = currentLanguage === 'ar' ? 'data-ar' : 'data-en';
        el.textContent = el.getAttribute(key);
    });

    // Update placeholders
    document.querySelectorAll('[data-ar-placeholder]').forEach(el => {
        const key = currentLanguage === 'ar' ? 'data-ar-placeholder' : 'data-en-placeholder';
        el.placeholder = el.getAttribute(key);
    });
}

// Chat Functions
async function initChat() {
    console.log('🚀 Initializing LLM-driven conversation...');

    // Initialize chat history with system prompt
    chatHistory = [
        {
            role: 'system',
            content: CONFIG.PROMPTS.CHAT_SYSTEM
        }
    ];

    // Get initial greeting from LLM
    await getAIResponse();
}

function addMessage(sender, text, isHtml = false) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (isHtml) {
        bubble.innerHTML = text;
    } else {
        bubble.textContent = text;
    }

    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return bubble;
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.id = 'typingIndicator';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble typing-indicator';
    bubble.innerHTML = '<span></span><span></span><span></span>';

    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

/**
 * Parse JSON state from LLM response
 * Extracts the JSON block at the end of the message
 */
function parseLLMState(message) {
    try {
        // Look for JSON block at the end of the message
        const jsonMatch = message.match(/\{[\s\S]*"phase"[\s\S]*\}/);

        if (jsonMatch) {
            const jsonStr = jsonMatch[0];
            const state = JSON.parse(jsonStr);

            console.log('📊 Parsed LLM state:', state);
            return state;
        }

        console.warn('⚠️ No JSON state found in LLM response');
        return null;
    } catch (error) {
        console.error('❌ Error parsing LLM state:', error);
        return null;
    }
}

/**
 * Extract clean message text (without JSON)
 */
function extractMessageText(fullMessage) {
    // Remove ANY markdown code fence with "json" (most common case)
    let cleanMessage = fullMessage.replace(/```json[\s\S]*?```/g, '').trim();

    // Remove plain ``` code blocks that might contain JSON
    cleanMessage = cleanMessage.replace(/```[\s\S]*?```/g, '').trim();

    // Fallback: Remove JSON objects that contain "phase" (from system prompt)
    cleanMessage = cleanMessage.replace(/\{[\s\S]*?"phase"[\s\S]*?\}/g, '').trim();

    return cleanMessage;
}

/**
 * Update UI based on current phase
 */
function updateUIForPhase(phase) {
    console.log(`🎯 Updating UI for phase: ${phase}`);

    const messageInput = document.getElementById('messageInput');
    const attachBtn = document.getElementById('attachBtn');

    // Phases that allow file upload
    const uploadPhases = ['accident_photos', 'id_card', 'driving_license', 'vehicle_registration'];

    if (uploadPhases.includes(phase)) {
        // Enable file upload
        if (attachBtn) attachBtn.style.display = 'block';
        if (messageInput) messageInput.placeholder = currentLanguage === 'ar'
            ? 'يرجى رفع الصورة المطلوبة...'
            : 'Please upload the required image...';
    } else {
        // Enable text input
        if (messageInput) messageInput.placeholder = currentLanguage === 'ar'
            ? 'اكتب رسالتك...'
            : 'Type your message...';
    }
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message) return;

    // Clear input
    input.value = '';

    // Add user message
    addMessage('user', message);

    // Add to chat history
    chatHistory.push({
        role: 'user',
        content: message
    });

    // Get AI response
    await getAIResponse();
}

async function getAIResponse() {
    if (!validateConfig()) {
        addMessage('system', currentLanguage === 'ar'
            ? '⚠️ يرجى تكوين مفتاح OpenAI API في config.js'
            : '⚠️ Please configure OpenAI API key in config.js');
        return;
    }

    showTypingIndicator();

    try {
        const response = await fetch(`${CONFIG.OPENAI_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.MODELS.CHAT,
                messages: chatHistory,
                temperature: 0.7,
                max_tokens: 800
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const fullMessage = data.choices[0].message.content;

        removeTypingIndicator();

        // Parse JSON state from response
        const state = parseLLMState(fullMessage);

        // Extract clean message text (without JSON)
        const messageText = extractMessageText(fullMessage);

        // Add assistant message to UI
        addMessage('assistant', messageText);

        // Add to chat history (full message with JSON for context)
        chatHistory.push({
            role: 'assistant',
            content: fullMessage
        });

        // Update state if JSON was parsed
        if (state && state.phase) {
            currentPhase = state.phase;
            ticketData = state.ticket || ticketData;

            console.log(`📍 Current phase: ${currentPhase}`);
            console.log(`📋 Ticket data:`, ticketData);

            // Update UI based on phase
            updateUIForPhase(currentPhase);

            // ✅ FIXED: If phase is "done" AND ticket not already created, create the ticket ONCE
            if (currentPhase === 'done' && !ticketAlreadyCreated) {
                await createTicketFromLLMData();
            }
        }

        // Play TTS if voice is enabled
        if (voiceEnabled && typeof window.elevenLabsTTS !== 'undefined') {
            window.elevenLabsTTS.speakAssistantMessage(messageText, currentLanguage)
                .catch(err => console.error('TTS playback error:', err));
        }

    } catch (error) {
        removeTypingIndicator();
        console.error('Error getting AI response:', error);
        addMessage('system', currentLanguage === 'ar'
            ? '❌ عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
            : '❌ Sorry, an error occurred. Please try again.');
    }
}

// Image Upload
function uploadImage() {
    document.getElementById('imageInput').click();
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert(currentLanguage === 'ar'
            ? 'يرجى اختيار صورة صحيحة'
            : 'Please select a valid image');
        return;
    }

    // Check if we're in a valid upload phase
    const validUploadPhases = ['accident_photos', 'id_card', 'driving_license', 'vehicle_registration'];
    if (!validUploadPhases.includes(currentPhase)) {
        addMessage('system', currentLanguage === 'ar'
            ? 'يرجى انتظار التعليمات قبل رفع الصور. سيطلب منك المساعد رفع الصور في الوقت المناسب.'
            : 'Please wait for instructions before uploading images. The assistant will ask you to upload images at the appropriate time.');
        // Reset input
        event.target.value = '';
        return;
    }

    // Show image in chat
    const reader = new FileReader();
    reader.onload = async function(e) {
        const imageData = e.target.result;

        // Add image to chat
        const bubble = addMessage('user', '', true);
        bubble.innerHTML = `<img src="${imageData}" class="message-image" alt="Uploaded image">`;

        // Show uploading message
        const uploadingText = 'جاري رفع الصورة...';
        const uploadingMessage = addMessage('system', uploadingText);

        try {
            // Upload file based on current phase
            let uploadType;
            switch (currentPhase) {
                case 'accident_photos':
                    uploadType = 'accident_photos';
                    break;
                case 'id_card':
                    uploadType = 'id_cards'; // Plural for backend folder
                    break;
                case 'driving_license':
                    uploadType = 'driving_licenses'; // Plural for backend folder
                    break;
                case 'vehicle_registration':
                    uploadType = 'vehicle_registrations'; // Plural for backend folder
                    break;
            }

            console.log(`📤 Uploading to folder: /uploads/${uploadType}`);

            // Upload to backend
            const result = await window.backendAPI.uploadImage(file, uploadType);

            // ✅ Track uploaded files for final ticket structure
            if (uploadType === 'accident_photos') {
                uploadedFiles.accident_photos.push({
                    filename: result.file.filename,
                    url: result.file.url,
                    type: uploadType
                });
            } else {
                // For single-file uploads (id_card, driving_license, vehicle_registration)
                const key = currentPhase; // Use phase as key
                uploadedFiles[key] = {
                    filename: result.file.filename,
                    url: result.file.url,
                    type: uploadType
                };
            }

            console.log('📁 Updated uploadedFiles:', uploadedFiles);

            // Remove uploading message
            uploadingMessage.parentElement.remove();

            // Show success message
            addMessage('system', 'تم رفع الصورة بنجاح ✅');

            // Notify LLM about the upload
            const uploadNotification = currentLanguage === 'ar'
                ? `تم رفع الصورة بنجاح`
                : `Image uploaded successfully`;

            // Add to chat history
            chatHistory.push({
                role: 'user',
                content: uploadNotification
            });

            // Get next instruction from LLM
            await getAIResponse();

        } catch (error) {
            // Remove uploading message
            uploadingMessage.parentElement.remove();

            console.error('❌ Upload error:', error);
            addMessage('system', 'عذراً، حدث خطأ أثناء رفع الصورة. يرجى المحاولة مرة أخرى.');
        }
    };

    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
}

/**
 * Create ticket from LLM data when phase is "done"
 * ✅ FIXED: Now sends ticket to backend at POST http://13.51.235.197:3000/tickets
 */
async function createTicketFromLLMData() {
    try {
        // ✅ Safety check: prevent duplicate creation
        if (ticketAlreadyCreated) {
            console.log('⚠️ Ticket already created, skipping...');
            return;
        }

        console.log('🎫 Creating ticket from LLM data...');

        const ticketId = `T-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Prepare extracted data including all uploaded files
        const extracted_data = {
            description: ticketData.description || '',
            location: ticketData.location || '',
            number_of_vehicles: ticketData.number_of_vehicles || 0,
            injuries: ticketData.injuries || false,
            accident_photos_count: ticketData.accident_photos_count || 0,
            id_card_received: ticketData.id_card_received || false,
            driving_license_received: ticketData.driving_license_received || false,
            vehicle_registration_received: ticketData.vehicle_registration_received || false,
            // Include all uploaded files
            uploads: {
                accident_photos: uploadedFiles.accident_photos || [],
                id_card: uploadedFiles.id_card || null,
                driving_license: uploadedFiles.driving_license || null,
                vehicle_registration: uploadedFiles.vehicle_registration || null
            }
        };

        // Prepare ticket payload for backend
        const ticketPayload = {
            ticket_id: ticketId,
            transcript: chatHistory,
            extracted_data: extracted_data,
            description: ticketData.description || 'Accident report'
        };

        console.log('📤 Sending ticket to backend:', ticketPayload);

        // ✅ FIXED: Send to backend POST /tickets
        const response = await fetch('https://13.51.235.197/tickets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ticketPayload)
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Ticket saved to backend:', result);

        // Show success message
        const successMessage = currentLanguage === 'ar'
            ? `✅ تم إنشاء التذكرة بنجاح!\n\nرقم التذكرة: ${ticketId}\n\nاحتفظ بهذا الرقم للمتابعة.`
            : `✅ Ticket created successfully!\n\nTicket ID: ${ticketId}\n\nKeep this number for follow-up.`;

        addMessage('system', successMessage);

        // Store ticket locally
        tickets.push(result.ticket || ticketPayload);
        currentTicket = result.ticket || ticketPayload;

        // ✅ CRITICAL: Mark ticket as created and set phase to completed
        ticketAlreadyCreated = true;
        currentPhase = 'completed';

        console.log('✅ Ticket creation completed. Flag set to prevent duplicates.');

    } catch (error) {
        console.error('❌ Error creating ticket:', error);
        addMessage('system', 'عذراً، حدث خطأ أثناء إنشاء التذكرة.');
    }
}

// Utility function to manually create a ticket (for testing)
function manualCreateTicket() {
    if (!currentTicket) {
        currentTicket = {
            ocrData: {
                plate: '1234ABC',
                vehicles: 2,
                damage: 'Front bumper damage'
            }
        };
    }
    return createTicketFromLLMData();
}

// Admin panel link (accessible via URL parameter ?admin=true)
console.log('To access admin panel, add ?admin=true to URL or navigate directly');
console.log('🤖 LLM-driven conversation system active');
