import { useEffect, useState } from 'react';

export function getVideoIdFromItem(item: any): string | null {
  if (item?.extractedMetadata?.videoId) return item.extractedMetadata.videoId;
  const m = item?.url?.match(/[?&]v=([\w-]{11})/) ?? item?.url?.match(/youtu\.be\/([\w-]{11})/);
  return m ? m[1] : null;
}

function checkThumbnailExists(videoId: string, timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const img = new Image();
    img.onload = () => {
      if (!settled) {
        settled = true;
        const isGenericPlaceholder = img.naturalWidth === 120 && img.naturalHeight === 90;
        resolve(!isGenericPlaceholder);
      }
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    };
    img.src = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
    // Fallback timeout
    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, timeout);
  });
}

// items: raw items array
// getId: function to extract videoId string or null
export function usePlayableFilter<T = any>(items: T[], getId: (t: T) => string | null) {
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const ids = Array.from(new Set(items.map(getId).filter(Boolean) as string[]));
    ids.forEach((id) => {
      if (id in statusMap) return;
      // check in background
      checkThumbnailExists(id).then((ok) => {
        setStatusMap((s) => ({ ...s, [id]: ok }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const filtered = items.filter((it) => {
    const id = getId(it);
    if (!id) return false;
    if (id in statusMap && statusMap[id] === false) return false;
    return true;
  });

  return { filtered, statusMap } as const;
}
