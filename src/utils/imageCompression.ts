export function compressAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 240;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Unsupported image format'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Unable to read image file'));
    reader.readAsDataURL(file);
  });
}

export function compressReceiptFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 960;
        const maxHeight = 1280;
        const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Keep compressed base64 well below 145KB Firestore field ceiling
        let quality = 0.72;
        let result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > 140000 && quality > 0.35) {
          quality -= 0.12;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.onerror = () => reject(new Error('Unsupported receipt image format'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Unable to read receipt image'));
    reader.readAsDataURL(file);
  });
}

export function compressGalleryImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 960;
        const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.fillStyle = '#0A192F';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        let quality = 0.78;
        let result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > 142000 && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.onerror = () => reject(new Error('Unsupported gallery image format'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Unable to read gallery image file'));
    reader.readAsDataURL(file);
  });
}
