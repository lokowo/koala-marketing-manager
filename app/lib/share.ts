function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

export function shareToWechat(text: string): string {
  copyText(text);
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  if (isMobile) {
    setTimeout(() => { window.location.href = 'weixin://'; }, 300);
    return '✅ 文案已复制，正在打开微信...';
  }
  return '✅ 文案已复制，请打开微信粘贴发送';
}

export function shareToMoments(text: string): string {
  copyText(text);
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  if (isMobile) {
    setTimeout(() => { window.location.href = 'weixin://dl/moments'; }, 300);
    return '✅ 文案已复制，正在打开朋友圈...';
  }
  return '✅ 文案已复制，请打开微信朋友圈粘贴发布';
}
