'use client'

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Instagram, MessageSquare, X, ShoppingCart, Copy, AlertCircle, Zap, Gift } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, writeBatch, Timestamp, doc } from 'firebase/firestore';

interface Ticket {
  number: number;
  status: 'sold' | 'pending';
  buyerName?: string;
  buyerEmail?: string;
  reservationTimestamp?: Timestamp;
}

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
  watchInfo?: string;
  imageUrl: string;
  totalTickets: number;
  isActive: boolean;
  ticketPackages: TicketPackage[];
}

export default function RaffleClient({ raffleData }: { raffleData: Raffle }) {
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  const [unavailableTickets, setUnavailableTickets] = useState<Ticket[]>([]);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [randomQuantity, setRandomQuantity] = useState('');
  const [promotionNotification, setPromotionNotification] = useState<string | null>(null);

  useEffect(() => {
    const ticketsCollection = collection(db, 'raffles', raffleData.id, 'tickets');
    const unsubscribe = onSnapshot(ticketsCollection, (snapshot) => {
      const ticketsList = snapshot.docs.map(doc => doc.data() as Ticket);
      setUnavailableTickets(ticketsList);
    });
    return () => unsubscribe();
  }, [raffleData.id]);

  useEffect(() => {
    const numSelected = selectedTickets.length;
    const promotions = [
        { paid: 5, free: 1, total: 6 },
        { paid: 10, free: 3, total: 13 },
        { paid: 20, free: 6, total: 26 },
        { paid: 50, free: 15, total: 65 },
        { paid: 500, free: 150, total: 650 }
    ];
    
    const applicablePromo = promotions.find(p => p.paid === numSelected);

    if (applicablePromo) {
      setPromotionNotification(`¡Tienes ${applicablePromo.free} boleto(s) de regalo! Elige ${applicablePromo.free} más para aprovechar la promoción.`);
    } else {
      setPromotionNotification(null);
    }

  }, [selectedTickets]);

  const totalCost = useMemo(() => {
    const numTickets = selectedTickets.length;
    if (numTickets === 0) return 0;
    
    if (numTickets === 6) return 500;
    if (numTickets === 13) return 1050;
    if (numTickets === 26) return 2000;
    if (numTickets === 65) return 5000;
    if (numTickets === 650) return 55000;
    
    const fifties = Math.floor(numTickets / 50);
    let remaining = numTickets % 50;
    const twenties = Math.floor(remaining / 20);
    remaining %= 20;
    const tens = Math.floor(remaining / 10);
    remaining %= 10;
    const fives = Math.floor(remaining / 5);
    const singles = remaining % 5;
    
    return (fifties * 5000) + (twenties * 2000) + (tens * 1050) + (fives * 500) + (singles * 150);
  }, [selectedTickets]);
  
  const handleTicketClick = (ticketNumber: number) => {
    if (unavailableTickets.some(t => t.number === ticketNumber)) return;
    setSelectedTickets((prev) =>
      prev.includes(ticketNumber)
        ? prev.filter((t) => t !== ticketNumber)
        : [...prev, ticketNumber].sort((a,b) => a - b)
    );
  };
  
  const handleCreateReservation = async (buyerInfo: { name: string; email: string }) => {
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();
      
      selectedTickets.forEach(ticketNumber => {
        const ticketRef = doc(db, 'raffles', raffleData.id, 'tickets', String(ticketNumber));
        batch.set(ticketRef, {
          number: ticketNumber,
          buyerName: buyerInfo.name,
          buyerEmail: buyerInfo.email,
          status: 'pending',
          reservationTimestamp: now
        });
      });

      await batch.commit();
      alert(`¡Tus boletos [${selectedTickets.join(', ')}] han sido reservados!\n\nTienes 24 horas para completar tu pago y enviar tu comprobante por WhatsApp.`);
      setShowReservationModal(false);
      setSelectedTickets([]);
    } catch (error) {
      console.error("Error al crear la reservación:", error);
      alert("Hubo un error al reservar tus boletos. Por favor, intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomSelection = () => {
    const quantity = parseInt(randomQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      alert("Por favor, ingresa una cantidad válida de boletos.");
      return;
    }

    const allTicketNumbers = Array.from({ length: raffleData.totalTickets }, (_, i) => i + 1);
    const unavailableNumbers = unavailableTickets.map(t => t.number);
    const availableTickets = allTicketNumbers.filter(num => !unavailableNumbers.includes(num));

    if (quantity > availableTickets.length) {
      alert(`No hay suficientes boletos disponibles. Solo quedan ${availableTickets.length}.`);
      return;
    }

    const shuffled = availableTickets.sort(() => 0.5 - Math.random());
    const randomSelection = shuffled.slice(0, quantity).sort((a, b) => a - b);
    setSelectedTickets(randomSelection);
    setRandomQuantity('');
  };

  const ReservationModal = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name || !email) {
        alert("Por favor, completa tu nombre y correo para la reservación.");
        return;
      }
      handleCreateReservation({ name, email });
    }

    const copyToClipboard = (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      alert(`${label} copiado al portapapeles`);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
        <form onSubmit={handleSubmit} className="bg-brand-darkest border border-brand-olive rounded-lg p-6 md:p-8 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto">
          <button type="button" onClick={() => setShowReservationModal(false)} className="absolute top-4 right-4 text-brand-beige-light hover:text-white">
            <X size={24} />
          </button>
          <h2 className="font-serif text-3xl text-center text-white mb-2">Reservar Boletos</h2>
          <p className="text-center text-brand-beige-light mb-6">Completa tus datos para reservar tus números. La reservación es válida por 24 horas.</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-white mb-2 text-lg">Paso 1: Realiza tu pago</h3>
                <div className="bg-brand-dark p-4 rounded-lg border border-brand-olive">
                  <p className="font-semibold text-white">PARA TRANSFERENCIA BANCARIA</p>
                  <p className="text-sm text-brand-beige-light">Beneficiario: SINDICATO UNION DE TRABAJADORES Y EMPLEADOS DEL TRANSPORTE EN GENERAL DEL MUNICIPIO DE OCOTLAN</p>
                  <p className="text-sm text-brand-beige-light">Institución: KUSPIT / UNALANAPAY</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-md font-mono text-brand-beige-rosy">CLABE: 653180003810254077</p>
                    <Copy size={16} className="cursor-pointer text-brand-beige-light" onClick={() => copyToClipboard('653180003810254077', 'CLABE')} />
                  </div>
                </div>
              </div>
              <div>
                <div className="bg-brand-dark p-4 rounded-lg border border-brand-olive">
                  <p className="font-semibold text-white">PARA PAGOS EN EFECTIVO Y DEPÓSITO (ATM)</p>
                  <p className="text-sm text-brand-beige-light">Beneficiario: SINDICATO DE TRABAJADORES Y OBREROS DE LA INDUSTRIA HOTELERA RESTAURANTES DE LA REPUBLICA MEXICANA.</p>
                  <p className="text-sm text-brand-beige-light">Institución: BBVA MEXICO</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-md font-mono text-brand-beige-rosy">Cuenta: 0118833249</p>
                     <Copy size={16} className="cursor-pointer text-brand-beige-light" onClick={() => copyToClipboard('0118833249', 'Número de cuenta')} />
                  </div>
                </div>
              </div>
              <div className="bg-yellow-900 border border-yellow-600 text-yellow-200 p-3 rounded-lg flex gap-2 items-start">
                <AlertCircle size={24} className="flex-shrink-0 mt-1"/>
                <p className="text-sm">Una vez realizado el pago, envía tu comprobante junto con los números de boleto y tu nombre al WhatsApp <a href="https://wa.me/523317417313" target="_blank" className="font-bold underline">33 1741 7313</a> para confirmar tu compra.</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-white mb-2 text-lg">Paso 2: Ingresa tus datos para reservar</h3>
              <div>
                <label className="block text-sm font-medium text-brand-beige-light mb-1" htmlFor="buyerName">Nombre Completo</label>
                <input id="buyerName" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-brand-dark border border-brand-olive rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-beige-rosy" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-beige-light mb-1" htmlFor="buyerEmail">Correo Electrónico</label>
                <input id="buyerEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-brand-dark border border-brand-olive rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-beige-rosy" required />
              </div>
              <div className="bg-brand-dark p-4 rounded-lg">
                <p className="text-brand-beige-light">Boletos a reservar: <span className="font-bold text-white">{selectedTickets.join(', ')}</span></p>
                <p className="text-brand-beige-light">Total a pagar: <span className="font-bold text-white">${totalCost.toLocaleString('es-MX')} MXN</span></p>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-brand-beige-rosy text-brand-darkest font-bold py-3 mt-6 rounded-md hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed">
                {isLoading ? 'Reservando...' : 'Confirmar mi Reservación'}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-darkest">
      {showReservationModal && <ReservationModal />}
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
          {raffleData.watchInfo && (
            <div className="mt-8 max-w-2xl mx-auto text-left bg-brand-dark p-6 rounded-lg border border-brand-olive">
              <h3 className="font-serif text-2xl text-white mb-4">Detalles del Reloj</h3>
              <p className="text-brand-beige-light text-lg whitespace-pre-wrap">{raffleData.watchInfo}</p>
            </div>
          )}
        </section>
        <section id="packages" className="py-12 max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-white text-center mb-8">Paquetes y Precios</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left border border-brand-olive">
              <thead className="bg-brand-dark">
                <tr>
                  <th className="p-4 font-semibold text-white">Paquete</th>
                  <th className="p-4 font-semibold text-white">Descripción</th>
                  <th className="p-4 font-semibold text-white">Precio</th>
                </tr>
              </thead>
              <tbody>
                {raffleData.ticketPackages.map((pkg, index) => (
                  <tr key={index} className="border-t border-brand-olive">
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
          
          <div className="mb-8 p-4 bg-brand-dark rounded-lg border border-brand-olive flex flex-col sm:flex-row items-center justify-center gap-4">
              <label htmlFor="random-quantity" className="text-brand-beige-light font-semibold">
                O compra boletos al azar:
              </label>
              <div className="flex gap-2">
                <input
                  id="random-quantity"
                  type="number"
                  min="1"
                  value={randomQuantity}
                  onChange={(e) => setRandomQuantity(e.target.value)}
                  placeholder="Cantidad"
                  className="bg-brand-darkest text-white border border-brand-olive rounded w-24 py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-beige-rosy"
                />
                <button
                  onClick={handleRandomSelection}
                  className="bg-brand-beige-rosy text-brand-darkest font-bold py-2 px-4 rounded-md hover:bg-opacity-90 transition-colors flex items-center gap-2"
                >
                  <Zap size={16} />
                  Aleatorio
                </button>
              </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {Array.from({ length: raffleData.totalTickets }, (_, i) => i + 1).map((number) => {
              const ticketInfo = unavailableTickets.find(t => t.number === number);
              const isSelected = selectedTickets.includes(number);
              let className = 'bg-brand-dark hover:bg-brand-olive text-brand-beige-light';
              let disabled = false;

              if (ticketInfo) {
                disabled = true;
                className = ticketInfo.status === 'sold' 
                  ? 'bg-red-800 text-white cursor-not-allowed opacity-70' 
                  : 'bg-yellow-600 text-white cursor-not-allowed opacity-80';
              } else if (isSelected) {
                className = 'bg-brand-beige-rosy text-brand-darkest scale-110';
              }

              return (
                <button
                  key={number}
                  onClick={() => handleTicketClick(number)}
                  disabled={disabled}
                  className={`p-2 rounded-md text-center font-bold transition-all duration-200 ${className}`}
                >
                  {String(number).padStart(3, '0')}
                </button>
              );
            })}
          </div>

          {promotionNotification && (
            <div className="mt-6 p-4 bg-yellow-900 border border-yellow-600 text-yellow-200 rounded-lg flex items-center justify-center gap-3 text-center">
              <Gift size={20} />
              <p className="font-semibold">{promotionNotification}</p>
            </div>
          )}
        </section>

        {selectedTickets.length > 0 && (
          <div className="sticky bottom-0 left-0 right-0 bg-brand-dark bg-opacity-90 backdrop-blur-sm p-4 z-40">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-white text-lg">{selectedTickets.length} boleto(s) seleccionado(s)</h3>
                <p className="text-brand-beige-light text-sm">Números: {selectedTickets.join(', ')}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-white text-2xl font-bold">${totalCost.toLocaleString('es-MX')}</p>
                <button onClick={() => setShowReservationModal(true)} className="bg-brand-beige-rosy text-brand-darkest font-bold py-3 px-6 rounded-md hover:bg-opacity-90 transition-colors flex items-center gap-2">
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
            <a href="https://wa.me/523317417313" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand-beige-light hover:text-brand-beige-rosy transition-colors">
              <MessageSquare size={20} />
              <span>33 1741 7313 (WhatsApp)</span>
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