/**
 * OCR Routes
 * Handles image upload and Azure OCR processing
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { extractVehicleData } = require('../ocr');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/images');
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: uuid-timestamp-originalname
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter - only accept images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and HEIC images are allowed.'), false);
    }
};

// Multer upload instance
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    }
});

/**
 * POST /api/ocr-upload
 * Upload image and extract vehicle data using Azure OCR
 *
 * Body (multipart/form-data):
 * - image: Image file (required)
 * - type: Type of image - "accident_photo", "id_card", "driver_license", "car_registration" (optional)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "plate": "ABC 1234",
 *     "damage": "Front bumper damage"
 *   },
 *   "file": {
 *     "filename": "...",
 *     "originalName": "...",
 *     "path": "...",
 *     "url": "..."
 *   }
 * }
 */
router.post('/ocr-upload', upload.single('image'), async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        const imageType = req.body.type || 'unknown';

        console.log(`📸 Image uploaded: ${req.file.filename} (Type: ${imageType})`);

        // Get the full path to the uploaded image
        const imagePath = req.file.path;

        // Extract vehicle data using Azure OCR
        let ocrResult = null;

        try {
            console.log('🔍 Starting OCR processing...');
            ocrResult = await extractVehicleData(imagePath);
            console.log('✅ OCR processing completed');
        } catch (ocrError) {
            console.error('❌ OCR processing error:', ocrError.message);
            // Continue even if OCR fails - we still want to save the image
            ocrResult = {
                plate: 'غير واضح',
                damage: 'غير واضح',
                error: ocrError.message
            };
        }

        // Construct file URL for frontend access
        const fileUrl = `/uploads/images/${req.file.filename}`;

        // Return success response
        res.json({
            success: true,
            message: 'Image uploaded and processed successfully',
            data: {
                plate: ocrResult.plate,
                damage: ocrResult.damage,
                confidence: ocrResult.confidence,
                rawText: ocrResult.rawText
            },
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: req.file.path,
                url: fileUrl,
                size: req.file.size,
                type: imageType
            }
        });

    } catch (error) {
        console.error('❌ OCR upload error:', error);

        // Clean up uploaded file if it exists
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Error processing image upload',
            error: error.message
        });
    }
});

/**
 * POST /api/ocr-upload/batch
 * Upload multiple images and process them with OCR
 *
 * Body (multipart/form-data):
 * - images: Array of image files (max 10)
 * - ticket_id: Associated ticket ID (optional)
 *
 * Response:
 * {
 *   "success": true,
 *   "results": [
 *     { "file": {...}, "data": {...} },
 *     ...
 *   ]
 * }
 */
router.post('/ocr-upload/batch', upload.array('images', 10), async (req, res) => {
    try {
        // Check if files were uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No image files provided'
            });
        }

        console.log(`📸 Processing ${req.files.length} images...`);

        // Process each image
        const results = [];

        for (const file of req.files) {
            try {
                // Extract vehicle data using Azure OCR
                const ocrResult = await extractVehicleData(file.path);

                const fileUrl = `/uploads/images/${file.filename}`;

                results.push({
                    success: true,
                    file: {
                        filename: file.filename,
                        originalName: file.originalname,
                        url: fileUrl,
                        size: file.size
                    },
                    data: {
                        plate: ocrResult.plate,
                        damage: ocrResult.damage,
                        confidence: ocrResult.confidence
                    }
                });
            } catch (fileError) {
                console.error(`Error processing ${file.filename}:`, fileError.message);
                results.push({
                    success: false,
                    file: {
                        filename: file.filename,
                        originalName: file.originalname
                    },
                    error: fileError.message
                });
            }
        }

        console.log(`✅ Batch processing completed: ${results.length} images`);

        res.json({
            success: true,
            message: `Processed ${results.length} images`,
            count: results.length,
            results
        });

    } catch (error) {
        console.error('❌ Batch OCR upload error:', error);

        // Clean up uploaded files
        if (req.files) {
            for (const file of req.files) {
                try {
                    fs.unlinkSync(file.path);
                } catch (unlinkError) {
                    console.error('Error deleting file:', unlinkError);
                }
            }
        }

        res.status(500).json({
            success: false,
            message: 'Error processing batch upload',
            error: error.message
        });
    }
});

/**
 * GET /api/ocr-upload/image/:filename
 * Download/view uploaded image
 */
router.get('/image/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(__dirname, '../uploads/images', filename);

        // Check if file exists
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        // Send the file
        res.sendFile(imagePath);

    } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving image'
        });
    }
});

/**
 * DELETE /api/ocr-upload/image/:filename
 * Delete uploaded image
 */
router.delete('/image/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(__dirname, '../uploads/images', filename);

        // Check if file exists
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        // Delete the file
        fs.unlinkSync(imagePath);

        console.log(`🗑️ Deleted image: ${filename}`);

        res.json({
            success: true,
            message: 'Image deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting image'
        });
    }
});

module.exports = router;
