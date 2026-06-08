export type UploadAsset = {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  type?: string | null;
};

function inferExtension(name?: string | null, mimeType?: string | null): string {
  const lowerName = (name || '').toLowerCase();
  if (lowerName.endsWith('.png')) return '.png';
  if (lowerName.endsWith('.webp')) return '.webp';
  if (lowerName.endsWith('.pdf')) return '.pdf';
  if (lowerName.endsWith('.jpeg') || lowerName.endsWith('.jpg')) return '.jpg';

  const lowerMime = (mimeType || '').toLowerCase();
  if (lowerMime.includes('png')) return '.png';
  if (lowerMime.includes('webp')) return '.webp';
  if (lowerMime.includes('pdf')) return '.pdf';

  return '.jpg';
}

export function toUploadFile(asset: UploadAsset, fallbackName = 'archivo'): { uri: string; name: string; type: string } {
  const extension = inferExtension(asset.name, asset.mimeType || asset.type);
  const mimeType = asset.mimeType || asset.type || (extension === '.pdf' ? 'application/pdf' : 'image/jpeg');

  return {
    uri: asset.uri,
    name: asset.name || `${fallbackName}${extension}`,
    type: mimeType,
  };
}
