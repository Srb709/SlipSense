import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'My Philly Leads Tool',
  description: 'Lead finder powered by public Philadelphia property data.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900">{children}</body>
    </html>
  );
}
