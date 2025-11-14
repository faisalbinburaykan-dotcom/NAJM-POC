// OCR and Image Analysis Functions
// Additional OCR utilities (main logic is in app.js)

// Validate image before upload
function validateImage(file) {
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        return {
            valid: false,
            error: currentLanguage === 'ar'
                ? 'حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت.'
                : 'Image size too large. Maximum 10MB.'
        };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: currentLanguage === 'ar'
                ? 'نوع الملف غير مدعوم. استخدم JPG أو PNG.'
                : 'File type not supported. Use JPG or PNG.'
        };
    }

    return { valid: true };
}

// Compress image before sending (optional optimization)
async function compressImage(file, maxWidth = 1200) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.85);
            };

            img.onerror = reject;
            img.src = e.target.result;
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Extract specific details from OCR result
function parseOCRResult(ocrData) {
    const parsed = {
        hasPlate: false,
        hasVehicleCount: false,
        hasDamageInfo: false
    };

    if (ocrData.plate && ocrData.plate !== 'N/A' && ocrData.plate !== 'غير واضح') {
        parsed.hasPlate = true;
    }

    if (ocrData.vehicles && typeof ocrData.vehicles === 'number') {
        parsed.hasVehicleCount = true;
    }

    if (ocrData.damage && ocrData.damage !== 'N/A' && ocrData.damage !== 'غير واضح') {
        parsed.hasDamageInfo = true;
    }

    parsed.completeness = [
        parsed.hasPlate,
        parsed.hasVehicleCount,
        parsed.hasDamageInfo
    ].filter(Boolean).length / 3;

    return parsed;
}

// Suggest next steps based on OCR results
function suggestNextSteps(ocrData) {
    const parsed = parseOCRResult(ocrData);

    const suggestions = [];

    if (!parsed.hasPlate) {
        suggestions.push(
            currentLanguage === 'ar'
                ? 'التقط صورة أوضح للوحة المركبة'
                : 'Take a clearer photo of the license plate'
        );
    }

    if (!parsed.hasDamageInfo) {
        suggestions.push(
            currentLanguage === 'ar'
                ? 'التقط صورة للأضرار من زوايا مختلفة'
                : 'Take photos of damage from different angles'
        );
    }

    if (parsed.completeness < 0.5) {
        suggestions.push(
            currentLanguage === 'ar'
                ? 'تأكد من وضوح الصورة والإضاءة الجيدة'
                : 'Ensure good lighting and clear image quality'
        );
    }

    return suggestions;
}

// Format Saudi license plate
function formatSaudiPlate(plateText) {
    // Saudi plates typically have Arabic letters followed by numbers
    // Example: أ ب ج ١٢٣٤ or ABC 1234
    // This is a simple formatter - enhance based on actual requirements

    if (!plateText) return 'N/A';

    // Remove extra spaces
    return plateText.trim().replace(/\s+/g, ' ');
}

// Validate extracted data
function validateOCRData(ocrData) {
    const errors = [];

    // Validate vehicles count
    if (ocrData.vehicles) {
        const count = parseInt(ocrData.vehicles);
        if (isNaN(count) || count < 1 || count > 10) {
            errors.push(
                currentLanguage === 'ar'
                    ? 'عدد المركبات غير صحيح'
                    : 'Invalid vehicle count'
            );
        }
    }

    // You can add more validation rules here

    return {
        valid: errors.length === 0,
        errors
    };
}
