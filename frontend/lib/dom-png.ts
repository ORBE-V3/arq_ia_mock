// Render a DOM node to PNG with no dependency: inline computed styles, wrap in SVG <foreignObject>, draw on canvas.
// ponytail: web fonts are not embedded (falls back to system fonts); switch to html-to-image if pixel-exact typography matters.

function inlineStyles(source: Element, target: Element) {
  const computed = getComputedStyle(source);
  let css = '';
  for (let i = 0; i < computed.length; i++) css += `${computed[i]}:${computed.getPropertyValue(computed[i])};`;
  target.setAttribute('style', css);
  Array.from(source.children).forEach((child, i) => target.children[i] && inlineStyles(child, target.children[i]));
}

export async function nodeToPng(node: HTMLElement, scale = 2): Promise<Blob> {
  const { width, height } = node.getBoundingClientRect();
  const clone = node.cloneNode(true) as HTMLElement;
  inlineStyles(node, clone);
  clone.querySelectorAll('[data-png-skip]').forEach((el) => el.remove());
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  const background = getComputedStyle(document.body).backgroundColor;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(clone)}</foreignObject></svg>`;
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(image, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar PNG'))), 'image/png'));
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
