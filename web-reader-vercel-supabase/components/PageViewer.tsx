type Props = { bookId: string; page: number };

export default function PageViewer({ bookId, page }: Props) {
  return (
    <section>
      <h2>Page Viewer</h2>
      <p>Book: {bookId}</p>
      <p>Page: {page}</p>
    </section>
  );
}