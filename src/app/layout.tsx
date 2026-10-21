import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '../context/AppContext';

export const metadata: Metadata = {
  title: 'Maple Check | Secretaria Maple Bear Araxá',
  description: 'Sistema de conferência e acompanhamento operacional de matrículas e rematrículas 2027.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
