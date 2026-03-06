/**
 * Client-side image compression for bill uploads.
 *
 * Resizes images to max 1600px on the longest side and converts to
 * JPEG at 80% quality. This keeps uploads well under the Vercel
 * Hobby plan's 4.5MB request body limit.
 *
 * PDFs are passed through as-is (Claude API handles them natively).
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;
const MAX_BASE64_SIZE = 3 * 1024 * 1024; // 3MB in base64 (~2.25MB raw)

/**
 * Compress an image file and return a base64 string + media type.
 * PDFs are converted to base64 without compression.
 *
 * @param {File} file - The file from the input/drop
 * @returns {Promise<{ base64: string, mediaType: string }>}
 */
export async function compressForUpload(file) {
  // PDFs: just convert to base64
  if (file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    return { base64, mediaType: 'application/pdf' };
  }

  // Images: resize and compress
  if (file.type.startsWith('image/')) {
    return compressImage(file);
  }

  throw new Error(`Unsupported file type: ${file.type}`);
}

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if larger than MAX_DIMENSION
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      const base64 = dataUrl.split(',')[1];

      // Check size — if still too large, compress more aggressively
      if (base64.length > MAX_BASE64_SIZE) {
        const smallerUrl = canvas.toDataURL('image/jpeg', 0.5);
        resolve({
          base64: smallerUrl.split(',')[1],
          mediaType: 'image/jpeg',
        });
      } else {
        resolve({ base64, mediaType: 'image/jpeg' });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
