import { useRouter } from 'next/router';

export default function PageViewerRoute() {
  const router = useRouter();
  const { bookId, page } = router.query as { bookId?: string; page?: string };
  return (
    <main style={{ padding: 24 }}>
      <h1>Viewer</h1>
      <p>Book: {bookId}</p>
      <p>Page: {page}</p>
    </main>
  );
}