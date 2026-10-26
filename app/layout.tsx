import type { ReactNode } from 'react';
import 'swagger-ui-react/swagger-ui.css';

export const metadata = {
  title: 'Adaptive Health Tracker API',
  description: 'REST API documentation',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}