import '@/app/islands.css';
import ShopifyPage from '@/components/ShopifyPage';
import { getNotFound } from '@/lib/content';

export const metadata = { title: { absolute: '404 Not Found – Disco Sundays' } };

export default function GlobalNotFound() {
  const page = getNotFound('en');
  return (
    <html lang="en" className="js">
      <body className="gradient" style={{ background: 'white' }}>
        {page ? <ShopifyPage page={page} /> : <h1>404 Not Found</h1>}
      </body>
    </html>
  );
}
