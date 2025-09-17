import { Suspense } from 'react';
import Image from 'next/image';
import SuccessClient from './SuccessClient'; // Importa el nuevo componente

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-brand-darkest text-brand-gray flex flex-col items-center justify-center p-8">
      <header className="mb-8">
        <Image src="/mikeyco-logo-largo-blanco.png" alt="Mike & Co Logo" width={250} height={80} />
      </header>
      
      <Suspense fallback={<p className="text-xl text-white">Cargando confirmación de compra...</p>}>
        <SuccessClient />
      </Suspense>

      <footer className="mt-12 text-brand-olive text-sm">
        <p>&copy; {new Date().getFullYear()} Mike & Co. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}