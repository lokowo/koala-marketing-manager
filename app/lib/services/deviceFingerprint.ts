export function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return '';

  const components: string[] = [];

  components.push(navigator.userAgent);
  components.push(navigator.language);
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  components.push(String(new Date().getTimezoneOffset()));
  components.push(navigator.platform || '');
  components.push(String(navigator.hardwareConcurrency || ''));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    components.push(canvas.toDataURL().slice(-50));
  }

  const raw = components.join('|||');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}
