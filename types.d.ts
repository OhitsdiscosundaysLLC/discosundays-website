import 'react';
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'cart-items': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { class?: string };
      'cart-note': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { class?: string };
    }
  }
}
