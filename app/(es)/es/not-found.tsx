import ShopifyPage from '@/components/ShopifyPage';
import { getNotFound } from '@/lib/content';

export const metadata = { title: { absolute: '404 Not Found – Disco Sundays' } };

export default function NotFound() {
  const page = getNotFound('es');
  return page ? <ShopifyPage page={page} /> : <h1>404 Not Found</h1>;
}
