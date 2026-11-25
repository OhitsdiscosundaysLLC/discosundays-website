import '@/app/islands.css';

export default function RootDocument({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <html lang={lang} className="js" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="" />
      </head>
      <body className="gradient" style={{ background: 'white' }} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
