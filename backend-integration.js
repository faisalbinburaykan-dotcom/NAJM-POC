/**
 * Backend Integration
 * Handles all API calls to the Node.js backend
 */

// Backend base URL
const BACKEND_URL = 'http://13.51.235.197:3000';
const CONVERSATION_SERVER_URL = 'http://13.51.235.197:3000';

// Store uploaded images temporarily before ticket creation
let uploadedImages = [];
let extractedData = {
    plate: null,
    damage: null,
    confidence: null
};

/**
 * Upload image to backend for OCR processing
 * @param {File} file - Image file to upload
 * @param {string} type - Type of image (accident_photo, id_card, driver_license, car_registration)
 * @returns {Promise<Object>} OCR result and file info
 */
async function uploadImageToBackend(file, type = 'accident_photo') {
    try {
        console.log(`📤 Uploading ${type} to conversation server...`);

        // Create FormData
        const formData = new FormData();
        formData.append('files', file);  // Changed from 'image' to 'files' for conversation server
        formData.append('type', type === 'accident_photo' ? 'accident_photos' : type);

        // Send to conversation server upload endpoint
        const response = await fetch(`${CONVERSATION_SERVER_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Upload failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Upload successful:', result);

        // Adapt response format to match expected structure
        const adaptedResult = {
            success: true,
            file: {
                filename: result.files[0].filename,
                originalName: file.name,
                url: result.files[0].url,
                type: result.files[0].type
            },
            ocr: {
                // No OCR data from conversation server, but keep structure
                text: 'Image uploaded successfully (OCR not available)',
                confidence: null
            }
        };

        result.success = true;
        result.file = adaptedResult.file;
        result.ocr = adaptedResult.ocr;

        // Store uploaded image info
        uploadedImages.push({
            filename: result.file.filename,
            originalName: result.file.originalName,
            url: result.file.url,
            filePath: result.file.url,
            fileType: file.type,
            attachmentType: type,
            type: type,
            size: result.file.size
        });

        // Store extracted data (use first image data if available from OCR)
        // Conversation server doesn't provide OCR data, so skip this
        if (result.data) {
            if (!extractedData.plate && result.data.plate !== 'غير واضح') {
                extractedData.plate = result.data.plate;
            }
            if (!extractedData.damage && result.data.damage !== 'غير واضح') {
                extractedData.damage = result.data.damage;
            }
            if (result.data.confidence) {
                extractedData.confidence = result.data.confidence;
            }
        }

        return result;

    } catch (error) {
        console.error('❌ Upload error:', error);
        throw error;
    }
}

/**
 * Create ticket with uploaded images
 * @param {string} ticketId - Unique ticket ID
 * @returns {Promise<Object>} Created ticket
 */
async function createTicketWithImages(ticketId) {
    try {
        console.log(`🎫 Creating ticket ${ticketId} with ${uploadedImages.length} attachments...`);

        const ticketData = {
            ticket_id: ticketId,
            plate: extractedData.plate || 'غير واضح',
            vehicles: 1, // Default, can be updated
            damage: extractedData.damage || 'غير واضح',
            attachments: uploadedImages
        };

        const response = await fetch(`${BACKEND_URL}/api/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ticketData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Ticket creation failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Ticket created:', result);

        // Clear temporary storage
        uploadedImages = [];
        extractedData = {
            plate: null,
            damage: null,
            confidence: null
        };

        return result;

    } catch (error) {
        console.error('❌ Ticket creation error:', error);
        throw error;
    }
}

/**
 * Get all tickets (for admin dashboard)
 * @param {string} token - JWT authentication token
 * @returns {Promise<Array>} List of tickets
 */
async function getAllTickets(token) {
    try {
        console.log('📡 Fetching tickets from:', `${CONVERSATION_SERVER_URL}/tickets`);

        const response = await fetch(`${CONVERSATION_SERVER_URL}/tickets`, {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch tickets: ${response.status}`);
        }

        const result = await response.json();
        console.log('📦 GET /tickets raw result:', result);

        // ✅ Ensure we return an array
        const tickets = Array.isArray(result.tickets) ? result.tickets : [];
        console.log(`✅ Returning ${tickets.length} tickets`);

        return tickets;

    } catch (error) {
        console.error('❌ Error fetching tickets:', error);
        // Return empty array instead of throwing to prevent UI crash
        return [];
    }
}

/**
 * Get single ticket details
 * @param {string} ticketId - Ticket ID
 * @param {string} token - JWT authentication token
 * @returns {Promise<Object>} Ticket details
 */
async function getTicketDetails(ticketId, token) {
    try {
        // ✅ FIXED: Fetch all tickets and find the specific one
        // (backend doesn't have /tickets/:id endpoint, only /tickets GET all)
        const response = await fetch(`${CONVERSATION_SERVER_URL}/tickets`, {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch tickets: ${response.status}`);
        }

        const result = await response.json();

        // ✅ Find the specific ticket by ID
        const tickets = result.tickets || [];
        const ticket = tickets.find(t => t.id === ticketId);

        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found`);
        }

        console.log('✅ Fetched ticket details:', ticket);
        return ticket;

    } catch (error) {
        console.error('❌ Error fetching ticket details:', error);
        throw error;
    }
}

/**
 * Get uploaded images count
 * @returns {number} Number of uploaded images
 */
function getUploadedImagesCount() {
    return uploadedImages.length;
}

/**
 * Get extracted data
 * @returns {Object} Extracted OCR data
 */
function getExtractedData() {
    return { ...extractedData };
}

/**
 * Clear uploaded images
 */
function clearUploadedImages() {
    uploadedImages = [];
    extractedData = {
        plate: null,
        damage: null,
        confidence: null
    };
}

/**
 * Login to backend
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} Login result with token
 */
async function loginToBackend(username, password) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Login failed');
        }

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('❌ Login error:', error);
        throw error;
    }
}

// Export functions to global scope
window.backendAPI = {
    uploadImage: uploadImageToBackend,
    createTicket: createTicketWithImages,
    getAllTickets,
    getTicketDetails,
    getUploadedImagesCount,
    getExtractedData,
    clearUploadedImages,
    login: loginToBackend,
    BACKEND_URL
};

console.log('✅ Backend integration loaded');
