import { notFound } from 'next/navigation';
import ShopifyPage from '@/components/ShopifyPage';
import { allSlugs, getPage } from '@/lib/content';
import { pageMetadata } from '@/lib/metadata';

export const dynamic = 'force-static';
export const dynamicParams = false;

type Props = { params: Promise<{ slug?: string[] }> };

export function generateStaticParams() {
  return allSlugs('en');
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = getPage(slug, 'en');
  return page ? pageMetadata(page) : {};
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const page = getPage(slug, 'en');
  if (!page) notFound();
  return <ShopifyPage page={page} />;
}
