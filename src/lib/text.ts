export const countLines = (text: string) => {
  if (!text) return 0;
  let count = 1;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) count++;
  return count;
};

export const byteLength = (text: string) => new TextEncoder().encode(text).length;

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const plural = (count: number, word: string, pluralWord = `${word}s`) =>
  `${count.toLocaleString()} ${count === 1 ? word : pluralWord}`;
