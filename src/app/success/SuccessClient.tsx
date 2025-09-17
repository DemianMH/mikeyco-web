'use client'; // <-- Esta directiva es crucial

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  return (
    <div className="bg-brand-dark p-8 rounded-lg shadow-lg text-center border border-brand-olive max-w-lg w-full">
      <h1 className="text-4xl font-serif text-white mb-4">¡Compra Exitosa!</h1>
      <p className="text-lg mb-6">Tus boletos han sido comprados con éxito. ¡Mucha suerte!</p>
      <p className="text-md mb-8">Recibirás un correo electrónico con los detalles de tu compra.</p>
      
      <Link href="/" className="bg-brand-beige-rosy text-brand-darkest font-bold py-3 px-6 rounded-md hover:bg-opacity-90 transition-colors inline-flex items-center gap-2">
        Volver a la Rifa
      </Link>
    </div>
  );
}