// Admin Panel Functions

let isAdminLoggedIn = false;

/**
 * Clean JSON blocks and code fences from message text
 * Used to remove technical JSON from assistant messages in the UI
 */
function cleanMessageText(text) {
    if (!text) return '';

    // Remove ANY markdown code fence with "json"
    let cleanText = text.replace(/```json[\s\S]*?```/g, '').trim();

    // Remove plain ``` code blocks
    cleanText = cleanText.replace(/```[\s\S]*?```/g, '').trim();

    // Remove JSON objects that contain "phase" (from system prompt)
    cleanText = cleanText.replace(/\{[\s\S]*?"phase"[\s\S]*?\}/g, '').trim();

    return cleanText;
}

// Admin Login
function adminLogin(event) {
    event.preventDefault();

    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;

    if (username === CONFIG.ADMIN.USERNAME && password === CONFIG.ADMIN.PASSWORD) {
        isAdminLoggedIn = true;
        showAdminDashboard();
    } else {
        alert(currentLanguage === 'ar'
            ? 'اسم المستخدم أو كلمة المرور غير صحيحة'
            : 'Invalid username or password');
    }
}

// Show Admin Dashboard
function showAdminDashboard() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';

    // Load tickets
    loadTickets();
}

// Admin Logout
function adminLogout() {
    isAdminLoggedIn = false;
    document.getElementById('adminLogin').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';

    // Clear form
    document.getElementById('adminUsername').value = '';
    document.getElementById('adminPassword').value = '';
}

// Load and display tickets from backend
async function loadTickets() {
    const tableBody = document.getElementById('ticketsTableBody');

    try {
        // Show loading message
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 40px;">
                    ${currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </td>
            </tr>
        `;

        // Get JWT token from localStorage
        const token = localStorage.getItem('najm_admin_token');
        if (!token) {
            console.log('ℹ️ No token found, fetching tickets without auth');
        }

        // Fetch tickets from backend
        const backendTickets = await window.backendAPI.getAllTickets(token);

        // ✅ Debug log
        console.log('📋 Tickets in admin panel:', backendTickets);
        console.log(`📊 Total tickets received: ${Array.isArray(backendTickets) ? backendTickets.length : 'NOT AN ARRAY'}`);

        // ✅ Ensure we have an array
        const tickets = Array.isArray(backendTickets) ? backendTickets : [];

        if (tickets.length === 0) {
            console.warn('⚠️ No tickets to display');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 40px; color: #999;">
                        ${currentLanguage === 'ar' ? 'لا توجد تذاكر حتى الآن' : 'No tickets yet'}
                    </td>
                </tr>
            `;
            return;
        }

        console.log(`✅ Rendering ${tickets.length} ticket(s)`);

        // Display tickets with 3 columns only
        tableBody.innerHTML = tickets.map((ticket, index) => {
            try {
                // ✅ Safe access with null checks
                if (!ticket || !ticket.id) {
                    console.error(`❌ Invalid ticket at index ${index}:`, ticket);
                    return ''; // Skip this ticket
                }

                const ex = ticket.extracted_data || {};
                let idCardInfo = currentLanguage === 'ar' ? 'غير متوفر' : 'N/A';

                // Priority: national_id field > ID card received flag
                if (ex.national_id) {
                    idCardInfo = ex.national_id;
                } else if (ex.id_card_received) {
                    idCardInfo = currentLanguage === 'ar' ? 'بطاقة الهوية مرفقة' : 'ID card attached';
                }

                // Default status to "Pending" if not set
                const status = ticket.status || 'pending';
                const statusText = currentLanguage === 'ar' ? 'قيد المراجعة' : 'Pending review';

                return `
                    <tr onclick="viewTicketDetails('${ticket.id}')" style="cursor: pointer;">
                        <td><span class="ticket-link">${ticket.id}</span></td>
                        <td>${idCardInfo}</td>
                        <td>
                            <span class="status status-${status.toLowerCase()}">
                                ${statusText}
                            </span>
                        </td>
                    </tr>
                `;
            } catch (rowError) {
                console.error(`❌ Error rendering ticket at index ${index}:`, rowError, ticket);
                return ''; // Skip this ticket if it causes an error
            }
        }).join('');

        console.log('✅ Table rendered successfully');

    } catch (error) {
        console.error('❌ Error loading tickets:', error);
        console.error('❌ Error stack:', error.stack);

        // Show actual error message instead of generic "no tickets"
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 40px; color: #d32f2f;">
                    ${currentLanguage === 'ar' ? 'حدث خطأ أثناء تحميل التذاكر' : 'Error loading tickets'}<br>
                    <small style="color: #999; font-size: 12px;">${error.message}</small>
                </td>
            </tr>
        `;
    }
}


// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };

    return date.toLocaleDateString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US', options);
}

// ✅ FIXED: View ticket details with correct field mapping
async function viewTicketDetails(ticketId) {
    try {
        const token = localStorage.getItem('najm_admin_token');
        const ticket = await window.backendAPI.getTicketDetails(ticketId, token);

        // ✅ Debug log to verify ticket structure
        console.log('📋 Ticket in details modal:', ticket);

        if (!ticket) {
            alert(currentLanguage === 'ar' ? 'التذكرة غير موجودة' : 'Ticket not found');
            return;
        }

        // ✅ Safe access to nested objects
        const ex = ticket.extracted_data || {};

        // ✅ ROBUST FALLBACK LOGIC: Handle both array and object formats
        let uploads = {};

        // Check if ticket.uploads exists and is not an empty array
        if (ticket.uploads && Array.isArray(ticket.uploads) && ticket.uploads.length > 0) {
            // Old format: uploads is an array
            uploads = ticket.uploads;
            console.log('📦 Using ticket.uploads (array format):', uploads);
        } else if (ticket.uploads && !Array.isArray(ticket.uploads) && Object.keys(ticket.uploads).length > 0) {
            // Old format: uploads is an object
            uploads = ticket.uploads;
            console.log('📦 Using ticket.uploads (object format):', uploads);
        } else if (ex.uploads && Object.keys(ex.uploads).length > 0) {
            // New format: uploads is nested in extracted_data
            uploads = ex.uploads;
            console.log('📦 Using ticket.extracted_data.uploads:', uploads);
        } else {
            console.warn('⚠️ No uploads found in ticket');
        }

        console.log('📋 Final uploads object:', uploads);
        console.log('📄 Document URLs:', {
            id_card: uploads.id_card?.url,
            driving_license: uploads.driving_license?.url,
            vehicle_registration: uploads.vehicle_registration?.url
        });

        // ✅ Ticket ID (رقم التذكرة)
        const ticketId_display = ticket.id || 'غير متوفر';

        // ✅ Created date (تاريخ الإنشاء)
        const createdDate = ticket.createdAt ? new Date(ticket.createdAt) : null;
        const createdDateDisplay = createdDate
            ? createdDate.toLocaleString('ar-SA', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'غير متوفر';

        // ✅ Description (وصف الحادث)
        const description = ex.description || ticket.description || 'غير متوفر';

        // ✅ Location (الموقع)
        const location = ex.location || 'غير متوفر';

        // ✅ Number of vehicles (عدد المركبات)
        const numVehicles = typeof ex.number_of_vehicles === 'number' ? ex.number_of_vehicles : 0;

        // ✅ Injuries (إصابات)
        const injuries = ex.injuries ? 'نعم' : 'لا';

        // ✅ Accident photos count (عدد صور الحادث)
        const photosCount = ex.accident_photos_count != null
            ? ex.accident_photos_count
            : (uploads.accident_photos ? uploads.accident_photos.length : 0);

        const status = ticket.status || 'pending';
        const statusText = currentLanguage === 'ar' ? 'قيد المراجعة' : 'Pending review';

        // ✅ Format transcript (array of {role, content} objects)
        let transcriptHtml = '';
        if (ticket.transcript && Array.isArray(ticket.transcript)) {
            transcriptHtml = ticket.transcript
                .filter(msg => msg.role !== 'system') // Skip system messages
                .map(msg => {
                    const roleLabel = msg.role === 'user'
                        ? (currentLanguage === 'ar' ? 'المستخدم' : 'User')
                        : (currentLanguage === 'ar' ? 'المساعد' : 'Assistant');
                    const bubbleClass = msg.role === 'user' ? 'user-bubble' : 'assistant-bubble';

                    // ✅ Clean JSON blocks from assistant messages
                    const displayContent = msg.role === 'assistant'
                        ? cleanMessageText(msg.content)
                        : msg.content;

                    return `
                        <div style="margin-bottom: 12px;">
                            <strong style="color: #333;">${roleLabel}:</strong>
                            <div class="${bubbleClass}" style="background: ${msg.role === 'user' ? '#33835c' : '#f5f5f5'}; color: ${msg.role === 'user' ? '#ffffff' : '#333'}; padding: 10px; border-radius: 8px; margin-top: 4px;">
                                ${escapeHtml(displayContent.substring(0, 500))}${displayContent.length > 500 ? '...' : ''}
                            </div>
                        </div>
                    `;
                }).join('');
        }

        // ✅ Build uploads section from extracted_data.uploads
        let uploadsHtml = '';
        // uploads is already defined at line 173, reuse it

        if (uploads.accident_photos && uploads.accident_photos.length > 0) {
            uploadsHtml += `
                <div style="margin-bottom: 16px;">
                    <h5 style="color: #666; margin-bottom: 8px;">${currentLanguage === 'ar' ? 'صور الحادث (3)' : 'Accident Photos (3)'}</h5>
                    <div class="ticket-files-row">
                        ${uploads.accident_photos.map(photo => `
                            <div class="ticket-file-card">
                                <div class="file-label">
                                    ${photo.filename.substring(0, 20)}...
                                </div>
                                <button type="button"
                                        onclick="window.open('https://13.51.235.197${photo.url}', '_blank')"
                                        class="ticket-file-btn">
                                    ${currentLanguage === 'ar' ? 'عرض' : 'View'}
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // ✅ Documents row - ID Card, Driving License, Vehicle Registration
        uploadsHtml += `
            <div style="margin-bottom: 16px; margin-top: 20px;">
                <h5 style="color: #666; margin-bottom: 8px;">${currentLanguage === 'ar' ? 'المستندات' : 'Documents'}</h5>
                <div class="ticket-files-row">
                    <!-- National ID Card -->
                    <div class="ticket-file-card">
                        <div class="file-label">
                            ${currentLanguage === 'ar' ? 'الهوية الوطنية' : 'National ID'}
                        </div>
                        ${uploads.id_card ? `
                            <button type="button"
                                    onclick="window.open('https://13.51.235.197${uploads.id_card.url}', '_blank')"
                                    class="ticket-file-btn">
                                ${currentLanguage === 'ar' ? 'عرض' : 'View'}
                            </button>
                        ` : `
                            <button type="button"
                                    disabled
                                    class="ticket-file-btn">
                                ${currentLanguage === 'ar' ? 'غير متوفر' : 'Not Available'}
                            </button>
                        `}
                    </div>

                    <!-- Driving License -->
                    <div class="ticket-file-card">
                        <div class="file-label">
                            ${currentLanguage === 'ar' ? 'رخصة القيادة' : 'Driving License'}
                        </div>
                        ${uploads.driving_license ? `
                            <button type="button"
                                    onclick="window.open('https://13.51.235.197${uploads.driving_license.url}', '_blank')"
                                    class="ticket-file-btn">
                                ${currentLanguage === 'ar' ? 'عرض' : 'View'}
                            </button>
                        ` : `
                            <button type="button"
                                    disabled
                                    class="ticket-file-btn">
                                ${currentLanguage === 'ar' ? 'غير متوفر' : 'Not Available'}
                            </button>
                        `}
                    </div>

                    <!-- Vehicle Registration -->
                    <div class="ticket-file-card">
                        <div class="file-label">
                            ${currentLanguage === 'ar' ? 'استمارة المركبة' : 'Vehicle Registration'}
                        </div>
                        ${uploads.vehicle_registration ? `
                            <button type="button"
                                    onclick="window.open('https://13.51.235.197${uploads.vehicle_registration.url}', '_blank')"
                                    class="ticket-file-btn">
                                ${currentLanguage === 'ar' ? 'عرض' : 'View'}
                            </button>
                        ` : `
                            <button type="button"
                                    disabled
                                    class="ticket-file-btn">
                                ${currentLanguage === 'ar' ? 'غير متوفر' : 'Not Available'}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;

        // ✅ Build complete details HTML with correctly mapped fields
        const detailsHtml = `
            <div class="ticket-info">
                <h4>${currentLanguage === 'ar' ? 'معلومات التذكرة' : 'Ticket Information'}</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>${currentLanguage === 'ar' ? 'رقم التذكرة' : 'Ticket ID'}</strong>
                        ${ticketId_display}
                    </div>
                    <div class="info-item">
                        <strong>${currentLanguage === 'ar' ? 'تاريخ الإنشاء' : 'Created Date'}</strong>
                        ${createdDateDisplay}
                    </div>
                    <div class="info-item">
                        <strong>${currentLanguage === 'ar' ? 'الحالة' : 'Status'}</strong>
                        <span class="status status-${status.toLowerCase()}">
                            ${statusText}
                        </span>
                    </div>
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <strong>${currentLanguage === 'ar' ? 'وصف الحادث' : 'Accident Description'}</strong>
                        <p style="margin-top: 6px; color: #555;">${description}</p>
                    </div>
                    <div class="info-item">
                        <strong>${currentLanguage === 'ar' ? 'الموقع' : 'Location'}</strong>
                        ${location}
                    </div>
                    <div class="info-item">
                        <strong>${currentLanguage === 'ar' ? 'عدد المركبات' : 'Number of Vehicles'}</strong>
                        ${numVehicles}
                    </div>
                    <div class="info-item">
                        <strong>${currentLanguage === 'ar' ? 'إصابات' : 'Injuries'}</strong>
                        ${injuries}
                    </div>
                    <div class="info-item">
                        <strong>${currentLanguage === 'ar' ? 'عدد صور الحادث' : 'Accident Photos Count'}</strong>
                        ${photosCount}
                    </div>
                </div>
            </div>

            ${uploadsHtml ? `
                <div class="ticket-info" style="margin-top: 20px;">
                    <h4>${currentLanguage === 'ar' ? 'الملفات المرفقة' : 'Uploaded Files'}</h4>
                    ${uploadsHtml}
                </div>
            ` : ''}

            ${transcriptHtml ? `
                <div class="conversation-transcript" style="margin-top: 20px;">
                    <h4>${currentLanguage === 'ar' ? 'سجل المحادثة' : 'Conversation Transcript'}</h4>
                    <div style="max-height: 400px; overflow-y: auto; padding: 12px; background: #fafafa; border-radius: 8px;">
                        ${transcriptHtml}
                    </div>
                </div>
            ` : ''}

            <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center;">
                <button class="retake-btn" onclick="closeTicketModal()">
                    ${currentLanguage === 'ar' ? 'إغلاق' : 'Close'}
                </button>
            </div>
        `;

        // Show modal
        document.getElementById('ticketDetails').innerHTML = detailsHtml;
        document.getElementById('ticketModal').style.display = 'flex';

    } catch (error) {
        console.error('Error loading ticket details:', error);
        alert(currentLanguage === 'ar'
            ? 'حدث خطأ أثناء تحميل تفاصيل التذكرة'
            : 'Error loading ticket details');
    }
}


// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// Close ticket modal
function closeTicketModal() {
    document.getElementById('ticketModal').style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('ticketModal');
    if (event.target === modal) {
        closeTicketModal();
    }
});


// Auto-refresh tickets every 30 seconds when dashboard is visible
let refreshInterval = null;

function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        if (isAdminLoggedIn && document.getElementById('adminDashboard').style.display !== 'none') {
            loadTickets();
        }
    }, 30000); // 30 seconds
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Start auto-refresh when page loads
document.addEventListener('DOMContentLoaded', function() {
    startAutoRefresh();
});
