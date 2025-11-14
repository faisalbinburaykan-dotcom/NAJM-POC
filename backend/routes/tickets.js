// Tickets Routes
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verifyToken } = require('./auth');

/**
 * GET /api/tickets
 * Get all tickets with attachments count (admin only)
 */
router.get('/', verifyToken, (req, res) => {
    try {
        const tickets = db.prepare(`
            SELECT * FROM tickets
            ORDER BY created_at DESC
        `).all();

        // Add attachments count to each ticket
        const ticketsWithAttachments = tickets.map(ticket => {
            const attachments = db.prepare(`
                SELECT * FROM attachments WHERE ticket_id = ?
            `).all(ticket.ticket_id);

            return {
                ...ticket,
                attachments_count: attachments.length,
                attachments: attachments
            };
        });

        res.json({
            success: true,
            count: ticketsWithAttachments.length,
            tickets: ticketsWithAttachments
        });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tickets'
        });
    }
});

/**
 * GET /api/tickets/:ticketId
 * Get single ticket with conversations, findings, and attachments
 */
router.get('/:ticketId', verifyToken, (req, res) => {
    try {
        const { ticketId } = req.params;

        // Get ticket
        const ticket = db.prepare('SELECT * FROM tickets WHERE ticket_id = ?').get(ticketId);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Get conversations
        const conversations = db.prepare(`
            SELECT * FROM conversations
            WHERE ticket_id = ?
            ORDER BY created_at ASC
        `).all(ticketId);

        // Get findings
        const findings = db.prepare(`
            SELECT * FROM findings
            WHERE ticket_id = ?
            ORDER BY created_at DESC
        `).all(ticketId);

        // Get audio files
        const audioFiles = db.prepare(`
            SELECT * FROM audio_files
            WHERE ticket_id = ?
            ORDER BY created_at ASC
        `).all(ticketId);

        // Get attachments (images)
        const attachments = db.prepare(`
            SELECT * FROM attachments
            WHERE ticket_id = ?
            ORDER BY created_at ASC
        `).all(ticketId);

        res.json({
            success: true,
            ticket,
            conversations,
            findings,
            audioFiles,
            attachments
        });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ticket'
        });
    }
});

/**
 * POST /api/tickets
 * Create new ticket with optional attachments
 *
 * Body:
 * - ticket_id: Unique ticket identifier (required)
 * - plate: License plate number
 * - vehicles: Number of vehicles involved
 * - damage: Damage description
 * - user_id: User ID
 * - attachments: Array of attachment objects (optional)
 *   Each attachment: { filename, originalName, filePath, fileType, attachmentType, size }
 */
router.post('/', (req, res) => {
    try {
        const { ticket_id, plate, vehicles, damage, user_id, attachments } = req.body;

        // Validate required fields
        if (!ticket_id) {
            return res.status(400).json({
                success: false,
                message: 'Ticket ID is required'
            });
        }

        // Insert ticket
        const ticketStmt = db.prepare(`
            INSERT INTO tickets (ticket_id, user_id, plate, vehicles, damage)
            VALUES (?, ?, ?, ?, ?)
        `);

        const ticketResult = ticketStmt.run(
            ticket_id,
            user_id || null,
            plate || null,
            vehicles || 1,
            damage || null
        );

        // If attachments are provided, insert them
        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            const attachmentStmt = db.prepare(`
                INSERT INTO attachments
                (ticket_id, filename, original_name, file_path, file_type, attachment_type, size)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            for (const attachment of attachments) {
                try {
                    attachmentStmt.run(
                        ticket_id,
                        attachment.filename,
                        attachment.originalName || attachment.filename,
                        attachment.filePath || attachment.url,
                        attachment.fileType || 'image/jpeg',
                        attachment.attachmentType || attachment.type || 'unknown',
                        attachment.size || 0
                    );
                    console.log(`📎 Attached file: ${attachment.filename} to ticket ${ticket_id}`);
                } catch (attachError) {
                    console.error('Error attaching file:', attachError);
                    // Continue with other attachments even if one fails
                }
            }
        }

        // Get created ticket with attachments
        const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketResult.lastInsertRowid);
        const ticketAttachments = db.prepare('SELECT * FROM attachments WHERE ticket_id = ?').all(ticket_id);

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            ticket,
            attachments: ticketAttachments
        });
    } catch (error) {
        console.error('Create ticket error:', error);

        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({
                success: false,
                message: 'Ticket ID already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating ticket',
            error: error.message
        });
    }
});

/**
 * PUT /api/tickets/:ticketId
 * Update ticket
 */
router.put('/:ticketId', verifyToken, (req, res) => {
    try {
        const { ticketId } = req.params;
        const { plate, vehicles, damage, status } = req.body;

        // Check if ticket exists
        const existing = db.prepare('SELECT * FROM tickets WHERE ticket_id = ?').get(ticketId);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Update ticket
        const stmt = db.prepare(`
            UPDATE tickets
            SET plate = COALESCE(?, plate),
                vehicles = COALESCE(?, vehicles),
                damage = COALESCE(?, damage),
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = ?
        `);

        stmt.run(plate, vehicles, damage, status, ticketId);

        // Get updated ticket
        const ticket = db.prepare('SELECT * FROM tickets WHERE ticket_id = ?').get(ticketId);

        res.json({
            success: true,
            message: 'Ticket updated successfully',
            ticket
        });
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating ticket'
        });
    }
});

/**
 * DELETE /api/tickets/:ticketId
 * Delete ticket (admin only)
 */
router.delete('/:ticketId', verifyToken, (req, res) => {
    try {
        const { ticketId } = req.params;

        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        // Delete ticket (cascades to conversations, findings, audio_files)
        const stmt = db.prepare('DELETE FROM tickets WHERE ticket_id = ?');
        const result = stmt.run(ticketId);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            message: 'Ticket deleted successfully'
        });
    } catch (error) {
        console.error('Delete ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting ticket'
        });
    }
});

/**
 * POST /api/tickets/:ticketId/conversations
 * Add conversation message to ticket
 */
router.post('/:ticketId/conversations', (req, res) => {
    try {
        const { ticketId } = req.params;
        const { role, content, audio_path, transcription } = req.body;

        // Validate
        if (!role || !content) {
            return res.status(400).json({
                success: false,
                message: 'Role and content are required'
            });
        }

        // Insert conversation
        const stmt = db.prepare(`
            INSERT INTO conversations (ticket_id, role, content, audio_path, transcription)
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = stmt.run(ticketId, role, content, audio_path || null, transcription || null);

        // Get created conversation
        const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json({
            success: true,
            message: 'Conversation added successfully',
            conversation
        });
    } catch (error) {
        console.error('Add conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding conversation'
        });
    }
});

/**
 * POST /api/tickets/:ticketId/findings
 * Add extracted finding to ticket
 */
router.post('/:ticketId/findings', (req, res) => {
    try {
        const { ticketId } = req.params;
        const { field_name, field_value, confidence, source } = req.body;

        // Validate
        if (!field_name) {
            return res.status(400).json({
                success: false,
                message: 'Field name is required'
            });
        }

        // Insert finding
        const stmt = db.prepare(`
            INSERT INTO findings (ticket_id, field_name, field_value, confidence, source)
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            ticketId,
            field_name,
            field_value || null,
            confidence || null,
            source || 'manual'
        );

        // Get created finding
        const finding = db.prepare('SELECT * FROM findings WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json({
            success: true,
            message: 'Finding added successfully',
            finding
        });
    } catch (error) {
        console.error('Add finding error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding finding'
        });
    }
});

module.exports = router;
