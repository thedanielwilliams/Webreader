import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function PageViewerRoute() {
  const router = useRouter();
  const { bookId, page } = router.query as { bookId?: string; page?: string };
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId || !page) return;
    const controller = new AbortController();
    setError(null);
    setImgUrl(null);

    fetch(`/api/page?bookId=${encodeURIComponent(bookId)}&page=${encodeURIComponent(page)}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          const msg = await r.text();
          throw new Error(`${r.status} ${msg}`);
        }
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        setImgUrl(url);
      })
      .catch((e) => {
        setError(e.message || 'Failed to load page');
      });

    return () => {
      controller.abort();
      if (imgUrl) URL.revokeObjectURL(imgUrl);
    };
  }, [bookId, page]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Viewer</h1>
      <p>Book: {bookId}</p>
      <p>Page: {page}</p>
      {error && (
        <p style={{ color: 'red' }}>
          {error.includes('401') ? 'Please sign in first to view pages.' : error}
        </p>
      )}
      {imgUrl ? (
        <img alt={`page ${page}`} src={imgUrl} style={{ maxWidth: '100%', height: 'auto' }} />
      ) : (
        !error && <p>Loading...</p>
      )}
    </main>
  );
}