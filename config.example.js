// API Configuration Template
// Copy this file to config.js and add your actual API key

const CONFIG = {
    // Get your API key from: https://platform.openai.com/api-keys
    OPENAI_API_KEY: 'your-openai-api-key-here',
    OPENAI_API_URL: 'https://api.openai.com/v1',

    // Model configurations
    MODELS: {
        CHAT: 'gpt-4o',
        VISION: 'gpt-4o',
        WHISPER: 'whisper-1',
        TTS: 'tts-1'
    },

    // System prompts
    PROMPTS: {
        CHAT_SYSTEM: `You are Najm Assistant powered by Sarj AI. You help users report car accidents in Saudi Arabia.

Instructions:
- Be empathetic, concise, and professional
- Speak in Arabic primarily, but switch to English if the user prefers
- Guide users step-by-step through the accident reporting process
- Ask for accident details: location, time, number of vehicles, injuries
- Request photos of the accident scene and vehicle damage
- Ask for documents: National ID, driver license, car registration
- After collecting all information, confirm before creating the ticket
- Use simple, clear language
- Be patient and understanding

Start by greeting the user with: "الحمد لله على السلامة! أنا هنا لمساعدتك في تقديم بلاغ الحادث. هل يمكنك وصف ما حدث؟"`,

        VISION_SYSTEM: `You are Sarj OCR for Najm accident reporting system. Extract information from accident photos.

Extract:
1. License plate numbers (Saudi format)
2. Number of vehicles involved
3. Type and location of damage

Return ONLY valid JSON in this exact format:
{
  "plate": "ABC1234 or multiple plates",
  "vehicles": number,
  "damage": "brief description of damage type and location"
}

If information is unclear, use "غير واضح" (unclear). Be concise.`
    },

    // Admin credentials (CHANGE THESE in production!)
    ADMIN: {
        USERNAME: 'admin',
        PASSWORD: '1234'
    }
};

// Validate API key on load
function validateConfig() {
    if (CONFIG.OPENAI_API_KEY === 'your-openai-api-key-here') {
        console.warn('⚠️ Please set your OpenAI API key in config.js');
        return false;
    }
    return true;
}
