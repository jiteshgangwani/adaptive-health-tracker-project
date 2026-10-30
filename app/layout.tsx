import type { ReactNode } from 'react';
import 'swagger-ui-react/swagger-ui.css';
import './globals.css';

export const metadata = {
  title: 'Forma — Your adaptive health companion',
  description: 'A thoughtful daily nutrition and movement plan that adapts to you.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}