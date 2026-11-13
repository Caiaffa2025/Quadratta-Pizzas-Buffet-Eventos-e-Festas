export interface CompressedImageResult {
  name: string;
  mimeType: 'image/jpeg' | 'image/webp' | 'image/png';
  dataUrl: string;
  sizeBytes: number;
}

const MAX_DATA_URL_LENGTH = 420000;

export async function compressImageFile(file: File): Promise<CompressedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem válido (JPG, PNG ou WebP).');
  }

  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      element.src = imageUrl;
    });

    const maxSide = 960;
    let targetW = img.naturalWidth || img.width;
    let targetH = img.naturalHeight || img.height;

    if (targetW > maxSide || targetH > maxSide) {
      if (targetW >= targetH) {
        targetH = Math.round((targetH * maxSide) / targetW);
        targetW = maxSide;
      } else {
        targetW = Math.round((targetW * maxSide) / targetH);
        targetH = maxSide;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, targetW);
    canvas.height = Math.max(1, targetH);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Navegador sem suporte para processamento de imagem.');
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Prefer WebP with fallback to JPEG; adapt quality to keep payload under Firestore limits
    const preferredMime: 'image/webp' | 'image/jpeg' = 'image/jpeg';
    let dataUrl = canvas.toDataURL(preferredMime, 0.84);
    let quality = 0.78;

    while (dataUrl.length > MAX_DATA_URL_LENGTH && quality >= 0.45) {
      dataUrl = canvas.toDataURL(preferredMime, quality);
      quality -= 0.08;
    }

    // If still too large, downscale dimensions further
    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      const scale = 0.72;
      canvas.width = Math.max(1, Math.round(canvas.width * scale));
      canvas.height = Math.max(1, Math.round(canvas.height * scale));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      dataUrl = canvas.toDataURL(preferredMime, 0.75);
    }

    if (dataUrl.length > 445000) {
      throw new Error('A imagem é muito pesada mesmo após otimização. Escolha uma imagem menor.');
    }

    const cleanName = file.name.trim().slice(0, 110) || 'imagem-quadratta.jpg';

    return {
      name: cleanName,
      mimeType: preferredMime,
      dataUrl,
      sizeBytes: dataUrl.length,
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
