/**
 * Azure Computer Vision OCR Module
 * Handles image OCR processing using Azure Cognitive Services
 */

const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const { ApiKeyCredentials } = require('@azure/ms-rest-js');
const fs = require('fs');

// Initialize Azure Computer Vision client
const key = process.env.AZURE_COMPUTER_VISION_KEY;
const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT;

if (!key || !endpoint) {
    console.error('❌ Azure Computer Vision credentials not found in .env file');
    console.error('Please set AZURE_COMPUTER_VISION_KEY and AZURE_COMPUTER_VISION_ENDPOINT');
}

const computerVisionClient = key && endpoint
    ? new ComputerVisionClient(
        new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } }),
        endpoint
    )
    : null;

/**
 * Extract text from image using Azure OCR
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} OCR result with extracted text
 */
async function extractTextFromImage(imagePath) {
    if (!computerVisionClient) {
        throw new Error('Azure Computer Vision client not initialized. Check your credentials.');
    }

    try {
        console.log(`🔍 Processing OCR for image: ${imagePath}`);

        // Read the image file
        const imageStream = fs.createReadStream(imagePath);

        // Call Azure Computer Vision Read API
        const readResult = await computerVisionClient.readInStream(imageStream);

        // Get operation location from response headers
        const operationLocation = readResult.operationLocation;
        const operationId = operationLocation.substring(operationLocation.lastIndexOf('/') + 1);

        // Wait for the read operation to complete
        let result;
        let status;
        do {
            await sleep(1000); // Wait 1 second between checks
            result = await computerVisionClient.getReadResult(operationId);
            status = result.status;
        } while (status === 'running' || status === 'notStarted');

        // Check if operation succeeded
        if (status !== 'succeeded') {
            throw new Error(`OCR operation failed with status: ${status}`);
        }

        // Extract all text from the result
        const extractedText = [];
        if (result.analyzeResult && result.analyzeResult.readResults) {
            for (const page of result.analyzeResult.readResults) {
                for (const line of page.lines) {
                    extractedText.push(line.text);
                }
            }
        }

        console.log(`✅ OCR completed. Extracted ${extractedText.length} lines of text`);

        return {
            success: true,
            text: extractedText.join('\n'),
            lines: extractedText,
            rawResult: result.analyzeResult
        };

    } catch (error) {
        console.error('❌ OCR Error:', error.message);
        throw error;
    }
}

/**
 * Extract structured data from Saudi license plate and vehicle images
 * Parses OCR text to identify plate number and damage description
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} Structured data: { plate, damage }
 */
async function extractVehicleData(imagePath) {
    try {
        // Get OCR text from image
        const ocrResult = await extractTextFromImage(imagePath);

        if (!ocrResult.success || !ocrResult.lines || ocrResult.lines.length === 0) {
            return {
                plate: 'غير واضح',
                damage: 'غير واضح'
            };
        }

        const allText = ocrResult.text;
        const lines = ocrResult.lines;

        // Extract Saudi license plate number
        // Saudi plates typically have Arabic letters + numbers (e.g., "ا ب ج 1234" or "ABC 1234")
        let plate = 'غير واضح';

        // Pattern 1: Look for numbers (plates usually have 3-4 digits)
        const numberPattern = /\b\d{3,4}\b/g;
        const numbers = allText.match(numberPattern);

        // Pattern 2: Look for Arabic letters followed by numbers
        const arabicPlatePattern = /[\u0600-\u06FF\s]{1,10}\d{3,4}/g;
        const arabicPlates = allText.match(arabicPlatePattern);

        // Pattern 3: Look for English letters followed by numbers
        const englishPlatePattern = /[A-Z]{1,3}\s*\d{3,4}/gi;
        const englishPlates = allText.match(englishPlatePattern);

        // Priority: Arabic plate > English plate > just numbers
        if (arabicPlates && arabicPlates.length > 0) {
            plate = arabicPlates[0].trim();
        } else if (englishPlates && englishPlates.length > 0) {
            plate = englishPlates[0].trim();
        } else if (numbers && numbers.length > 0) {
            plate = numbers[0];
        }

        // Extract damage description
        // Look for keywords related to damage in Arabic and English
        let damage = 'غير واضح';

        const damageKeywords = {
            ar: ['ضرر', 'تلف', 'كسر', 'خدش', 'صدمة', 'حادث', 'تصادم', 'أمامي', 'خلفي', 'جانبي'],
            en: ['damage', 'broken', 'scratch', 'dent', 'crack', 'collision', 'accident', 'front', 'rear', 'side', 'bumper']
        };

        // Check if any damage keywords are present
        const foundKeywords = [];
        const lowerText = allText.toLowerCase();

        for (const keyword of damageKeywords.ar) {
            if (allText.includes(keyword)) {
                foundKeywords.push(keyword);
            }
        }

        for (const keyword of damageKeywords.en) {
            if (lowerText.includes(keyword)) {
                foundKeywords.push(keyword);
            }
        }

        if (foundKeywords.length > 0) {
            damage = foundKeywords.join('، ');
        } else if (lines.length > 3) {
            // If no keywords but there's substantial text, use first meaningful line
            const meaningfulLines = lines.filter(line => line.length > 5);
            if (meaningfulLines.length > 0) {
                damage = meaningfulLines[0];
            }
        }

        console.log(`📊 Extracted vehicle data - Plate: ${plate}, Damage: ${damage}`);

        return {
            plate,
            damage,
            confidence: ocrResult.lines.length > 2 ? 0.8 : 0.5, // Simple confidence score
            rawText: allText
        };

    } catch (error) {
        console.error('❌ Error extracting vehicle data:', error.message);
        return {
            plate: 'غير واضح',
            damage: 'غير واضح',
            error: error.message
        };
    }
}

/**
 * Helper function to sleep/wait
 * @param {number} ms - Milliseconds to wait
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test function to verify OCR is working
 * @param {string} imagePath - Path to test image
 */
async function testOCR(imagePath) {
    console.log('🧪 Testing Azure OCR...');
    try {
        const result = await extractVehicleData(imagePath);
        console.log('✅ OCR Test Result:', result);
        return result;
    } catch (error) {
        console.error('❌ OCR Test Failed:', error.message);
        throw error;
    }
}

module.exports = {
    extractTextFromImage,
    extractVehicleData,
    testOCR
};
