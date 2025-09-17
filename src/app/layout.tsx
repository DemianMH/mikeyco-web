// src/app/layout.tsx

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

// --- INICIO DE CAMBIOS: METADATOS CON ÍCONOS Y MANIFEST ---
export const metadata = {
  // Metadatos existentes
  title: 'Mike & Co - Relojería y Joyería de Lujo',
  description: 'Participa en la exclusiva rifa de un reloj de lujo de Mike & Co. Selecciona tus números de la suerte, aprovecha nuestros paquetes y prepárate para ganar.',
  keywords: 'reloj, joyería, rifa, sorteo, lujo, Mike & Co, ganar reloj',
  
  // Manifiesto para PWA y Android
  manifest: '/site.webmanifest',
  
  // Configuración para Apple (iOS)
  appleWebApp: {
    title: 'M&Co',
    // statusBarStyle: 'black-translucent', // Puedes descomentar y ajustar si lo necesitas
  },
  
  // Todos tus íconos
  icons: {
    // Íconos estándar para navegadores
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' }
    ],
    // Ícono para Apple (ícono de la app en la pantalla de inicio)
    apple: '/apple-touch-icon.png',
    // Ícono legacy/shortcut
    shortcut: '/favicon.ico',
  },
};
// --- FIN DE CAMBIOS ---

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="bg-brand-darkest text-brand-gray font-sans">
        {children}
      </body>
    </html>
  );
}