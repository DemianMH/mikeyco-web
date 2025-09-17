import './globals.css';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { ReactNode } from 'react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata = {
  title: 'Mike & Co - Relojería y Joyería de Lujo',
  description: 'Participa en la exclusiva rifa de un reloj de lujo de Mike & Co. Selecciona tus números de la suerte, aprovecha nuestros paquetes y prepárate para ganar.',
  keywords: 'reloj, joyería, rifa, sorteo, lujo, Mike & Co, ganar reloj',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="bg-brand-darkest text-brand-gray font-sans">
        {children}
      </body>
    </html>
  );
}