const copyTextWithTextarea = (value: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const copyShareUrl = async (url: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }

  copyTextWithTextarea(url);
};

export const shareApp = async () => {
  const payload = {
    title: 'Visual Pomodoro',
    text: 'A minimalist focus timer for deep work.',
    url: window.location.origin,
  };

  if (navigator.share) {
    try {
      await navigator.share(payload);
      return 'shared' as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled' as const;
      }
    }
  }

  await copyShareUrl(payload.url);
  return 'copied' as const;
};
