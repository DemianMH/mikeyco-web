'use client'

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Instagram, Phone, MessageSquare, X, ShoppingCart } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface TicketPackage {
  code: string;
  tickets: number;
  price: number;
  priceText: string;
}

interface Raffle {
  id: string;
  productName: string;
  title: string;
  description: string;
  imageUrl: string;
  totalTickets: number;
  isActive: boolean;
  ticketPackages: TicketPackage[];
}

export default function RaffleClient({ raffleData }: { raffleData: Raffle }) {
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  const [soldTickets, setSoldTickets] = useState<number[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const ticketsCollection = collection(db, 'raffles', raffleData.id, 'tickets');
    const unsubscribe = onSnapshot(ticketsCollection, (snapshot) => {
      const sold = snapshot.docs.map(doc => doc.data().number);
      setSoldTickets(sold);
    });
    return () => unsubscribe();
  }, [raffleData.id]);

  const handleTicketClick = (ticketNumber: number) => {
    if (soldTickets.includes(ticketNumber)) return;
    setSelectedTickets((prev) =>
      prev.includes(ticketNumber)
        ? prev.filter((t) => t !== ticketNumber)
        : [...prev, ticketNumber].sort((a,b) => a - b)
    );
  };

  const totalCost = useMemo(() => {
    const numTickets = selectedTickets.length;
    if (numTickets === 0) return 0;
    const tens = Math.floor(numTickets / 10);
    const fives = Math.floor((numTickets % 10) / 5);
    const singles = (numTickets % 10) % 5;
    return tens * 1000 + fives * 500 + singles * 150;
  }, [selectedTickets]);

  const handleCheckout = async (buyerInfo: { name: string; email: string }) => {
    setIsLoading(true);
    const stripe = await stripePromise;

    const ticketsWithPrice = selectedTickets.map(num => ({
        number: num,
        price: raffleData.ticketPackages.find((p: TicketPackage) => p.tickets === 1)?.price || 150 // Usa el precio del paquete de 1 boleto o un default
    }));

    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tickets: ticketsWithPrice,
        raffleId: raffleData.id,
        raffleName: raffleData.productName,
        buyerInfo
      }),
    });

    const { sessionId, error } = await response.json();

    if (error) {
      alert(error.message);
      setIsLoading(false);
      return;
    }

    const result = await stripe!.redirectToCheckout({ sessionId });
    if (result.error) {
      alert(result.error.message);
    }
    setIsLoading(false);
  };

  const PaymentModal = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name || !email) {
        alert("Por favor, completa tu nombre y correo.");
        return;
      }
      handleCheckout({ name, email });
    }

    return (
      <form onSubmit={handleSubmit} className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
        <div className="bg-brand-darkest border border-brand-olive rounded-lg p-8 max-w-md w-full relative">
          <button type="button" onClick={() => setShowPayment(false)} className="absolute top-4 right-4 text-brand-beige-light hover:text-white">
            <X size={24} />
          </button>
          <h2 className="font-serif text-3xl text-center text-white mb-2">Confirmar Compra</h2>
          <p className="text-center text-brand-beige-light mb-6">Estás a un paso de participar.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-beige-light mb-1" htmlFor="buyerName">Nombre Completo</label>
              <input
                id="buyerName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-brand-dark border border-brand-olive rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-beige-rosy"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-beige-light mb-1" htmlFor="buyerEmail">Correo Electrónico</label>
              <input
                id="buyerEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-brand-dark border border-brand-olive rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-beige-rosy"
                required
              />
            </div>
            <p className="text-sm text-brand-beige-light text-center mt-4">Serás redirigido a Stripe para completar tu pago de forma segura.</p>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-beige-rosy text-brand-darkest font-bold py-3 mt-6 rounded-md hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-brand-darkest" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <ShoppingCart size={20} />
                Pagar ${totalCost.toLocaleString('es-MX')} MXN
              </>
            )}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-brand-darkest">
      {showPayment && <PaymentModal />}
      <header className="py-6 px-4 md:px-8 flex justify-center items-center">
        <Image src="/mikeyco-logo-largo-blanco.png" alt="Mike & Co Logo" width={300} height={100} priority />
      </header>
      <main className="px-4 md:px-8">
        <section id="hero" className="text-center py-12 md:py-20">
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-white leading-tight">{raffleData.title}</h1>
          <p className="text-brand-beige-light mt-4 max-w-2xl mx-auto">{raffleData.description}</p>
          <div className="mt-8 max-w-3xl mx-auto bg-brand-dark rounded-lg overflow-hidden">
            <Image src={raffleData.imageUrl} alt={raffleData.productName} width={1000} height={600} className="object-cover" />
          </div>
        </section>

        <section id="packages" className="py-12 max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-white text-center mb-8">Paquetes y Precios</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left border border-brand-olive">
              <thead className="bg-brand-dark">
                <tr>
                  <th className="p-4 font-semibold text-white">Código</th>
                  <th className="p-4 font-semibold text-white">Paquete de Boletos</th>
                  <th className="p-4 font-semibold text-white">Precio</th>
                </tr>
              </thead>
              <tbody>
                {raffleData.ticketPackages.map((pkg: TicketPackage) => (
                  <tr key={pkg.code} className="border-t border-brand-olive">
                    <td className="p-4 text-brand-beige-light">{pkg.code}</td>
                    <td className="p-4 text-brand-beige-light">{pkg.tickets} boleto(s)</td>
                    <td className="p-4 text-brand-beige-rosy font-bold">{pkg.priceText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="tickets" className="py-12 max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-white text-center mb-8">Elige tus Números</h2>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {Array.from({ length: raffleData.totalTickets }, (_, i) => i + 1).map((number) => {
              const isSelected = selectedTickets.includes(number);
              const isSold = soldTickets.includes(number);

              return (
                <button
                  key={number}
                  onClick={() => handleTicketClick(number)}
                  disabled={isSold}
                  className={`p-2 rounded-md text-center font-bold transition-all duration-200 ${
                    isSold
                      ? 'bg-red-800 text-white cursor-not-allowed opacity-70'
                      : isSelected
                      ? 'bg-brand-beige-rosy text-brand-darkest scale-110'
                      : 'bg-brand-dark hover:bg-brand-olive text-brand-beige-light'
                  }`}
                >
                  {String(number).padStart(3, '0')}
                </button>
              );
            })}
          </div>
        </section>

        {selectedTickets.length > 0 && (
          <div className="sticky bottom-0 left-0 right-0 bg-brand-dark bg-opacity-90 backdrop-blur-sm p-4 z-40">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              <div className='text-center md:text-left'>
                <h3 className="font-bold text-white text-lg">
                  {selectedTickets.length} boleto(s) seleccionado(s)
                </h3>
                <p className="text-brand-beige-light text-sm">Números: {selectedTickets.join(', ')}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-white text-2xl font-bold">${totalCost.toLocaleString('es-MX')}</p>
                <button onClick={() => setShowPayment(true)} className="bg-brand-beige-rosy text-brand-darkest font-bold py-3 px-6 rounded-md hover:bg-opacity-90 transition-colors flex items-center gap-2">
                  <ShoppingCart size={20} />
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 py-10 px-4 md:px-8 border-t border-brand-olive">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <Image src="/mikeyco-logo-corto-blanco.png" alt="Mike & Co Isotipo" width={150} height={80} />
            <p className="text-brand-beige-light mt-2">Mike & Co - Joyería y Relojería</p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-3">
            <h3 className="font-serif text-xl text-white">Contacto</h3>
            <a href="https://www.instagram.com/_mikeandco_" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand-beige-light hover:text-brand-beige-rosy transition-colors">
              <Instagram size={20} />
              <span>_mikeandco_</span>
            </a>
            <a href="https://wa.me/523333924652" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand-beige-light hover:text-brand-beige-rosy transition-colors">
              <MessageSquare size={20} />
              <span>33 3392 4652 (WhatsApp)</span>
            </a>
            <a href="tel:3327987257" className="flex items-center gap-2 text-brand-beige-light hover:text-brand-beige-rosy transition-colors">
              <Phone size={20} />
              <span>33 2798 7257 (Llamadas)</span>
            </a>
          </div>
        </div>
        <div className="text-center text-brand-olive mt-8 pt-6 border-t border-brand-olive border-opacity-30">
          <p>&copy; {new Date().getFullYear()} Mike & Co. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}