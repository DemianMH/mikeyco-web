'use client'

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Instagram, MessageSquare, X, ShoppingCart, Copy, AlertCircle, RefreshCw, Gift, Zap } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, writeBatch, Timestamp, doc } from 'firebase/firestore';

interface TicketPackage {
    code: string;
    price: number;
    paidTickets: number;
    freeTickets: number;
    totalTickets: number;
    displayText: string;
}

interface Ticket {
  number: number;
  status: 'sold' | 'pending';
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
  const [selectedPackage, setSelectedPackage] = useState<TicketPackage | null>(null);
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
    if (selectedPackage) return; // Si se seleccionó un paquete, no mostramos notificaciones de selección manual
    
    const numSelected = selectedTickets.length;
    const promotions = [...raffleData.ticketPackages].sort((a, b) => b.paidTickets - a.paidTickets);
    
    let promoFound = false;
    for (const promo of promotions) {
      if (numSelected >= promo.paidTickets && numSelected < promo.totalTickets) {
        const needed = promo.totalTickets - numSelected;
        setPromotionNotification(`¡Agrega ${needed} boleto(s) más para completar el paquete ${promo.code} y obtener el descuento!`);
        promoFound = true;
        break;
      }
    }

    if (!promoFound) {
      setPromotionNotification(null);
    }
  }, [selectedTickets, raffleData.ticketPackages, selectedPackage]);


  const totalCost = useMemo(() => {
    if (selectedPackage) {
      return selectedPackage.price;
    }
    
    const numTickets = selectedTickets.length;
    if (numTickets === 0) return 0;

    const promotions = [...raffleData.ticketPackages].sort((a, b) => b.totalTickets - a.totalTickets);
    let cost = 0;
    let remainingTickets = numTickets;

    for (const promo of promotions) {
        if (remainingTickets >= promo.totalTickets) {
            const count = Math.floor(remainingTickets / promo.totalTickets);
            cost += count * promo.price;
            remainingTickets %= promo.totalTickets;
        }
    }
    
    cost += remainingTickets * (promotions.find(p => p.totalTickets === 1)?.price || 150);

    return cost;
  }, [selectedTickets, selectedPackage, raffleData.ticketPackages]);

  const handleCreateReservation = async (buyerInfo: { name: string; email: string }) => {
    // ... (Sin cambios)
  };

  const handlePackageSelection = (pkg: TicketPackage) => {
    const allTicketNumbers = Array.from({ length: raffleData.totalTickets }, (_, i) => i + 1);
    const unavailableNumbers = unavailableTickets.map(t => t.number);
    const availableTickets = allTicketNumbers.filter(num => !unavailableNumbers.includes(num));

    if (pkg.totalTickets > availableTickets.length) {
      alert(`No hay suficientes boletos disponibles. Solo quedan ${availableTickets.length}.`);
      return;
    }
    const shuffled = availableTickets.sort(() => 0.5 - Math.random());
    const randomSelection = shuffled.slice(0, pkg.totalTickets).sort((a, b) => a - b);
    
    setSelectedTickets(randomSelection);
    setSelectedPackage(pkg);
  };
  
  const handleRandomSelection = () => {
    const quantity = parseInt(randomQuantity, 10);
     if (isNaN(quantity) || quantity <= 0) return;
     
     clearSelection();

    const allTicketNumbers = Array.from({ length: raffleData.totalTickets }, (_, i) => i + 1);
    const unavailableNumbers = unavailableTickets.map(t => t.number);
    const availableTickets = allTicketNumbers.filter(num => !unavailableNumbers.includes(num));
    
    if (quantity > availableTickets.length) {
      alert(`Solo quedan ${availableTickets.length} boletos disponibles.`);
      return;
    }

    const shuffled = availableTickets.sort(() => 0.5 - Math.random());
    const randomSelection = shuffled.slice(0, quantity).sort((a, b) => a - b);
    setSelectedTickets(randomSelection);
    setRandomQuantity('');
  };

  const handleTicketClick = (ticketNumber: number) => {
    if (unavailableTickets.some(t => t.number === ticketNumber)) return;
    
    if (selectedPackage) {
        clearSelection();
    }

    setSelectedTickets((prev) =>
      prev.includes(ticketNumber)
        ? prev.filter((t) => t !== ticketNumber)
        : [...prev, ticketNumber].sort((a,b) => a - b)
    );
  };

  const clearSelection = () => {
    setSelectedTickets([]);
    setSelectedPackage(null);
  };

  const ReservationModal = () => {
    // TODO: Implement the modal content here.
    // Example placeholder:
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">Reservar boletos</h2>
          {/* Add your reservation form or content here */}
          <button
            className="mt-4 bg-brand-beige-rosy text-brand-darkest py-2 px-4 rounded"
            onClick={() => setShowReservationModal(false)}
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-darkest">
      {showReservationModal && <ReservationModal />}
      <header>{/* ... */}</header>
      <main className="px-4 md:px-8">
        <section id="hero">{/* ... */}</section>
        
        <section id="packages" className="py-12 max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-white text-center mb-8">Elige un Paquete (Asignación Aleatoria)</h2>
          <div className="space-y-3">
            {raffleData.ticketPackages.map((pkg) => (
              <div key={pkg.code} className="bg-brand-dark border border-brand-olive rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold text-white text-lg">{pkg.code}</h3>
                  <p className="text-brand-beige-light">{pkg.displayText}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xl text-brand-beige-rosy font-bold">${pkg.price.toLocaleString('es-MX')} MXN</p>
                  <button onClick={() => handlePackageSelection(pkg)} className="bg-brand-beige-rosy text-brand-darkest font-bold py-2 px-4 rounded-md hover:bg-opacity-90 transition-colors">
                    Seleccionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="tickets" className="py-12 max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-white text-center mb-8">O Elige tus Números Manualmente</h2>
          
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
                className = ticketInfo.status === 'sold' ? 'bg-red-800 text-white' : 'bg-yellow-600 text-white';
                className += ' cursor-not-allowed opacity-70';
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
                    <h3 className="font-bold text-white text-lg">
                      {selectedPackage ? `Paquete ${selectedPackage.code} seleccionado` : `${selectedTickets.length} boleto(s) seleccionados`}
                    </h3>
                    <p className="text-brand-beige-light text-sm">Números: {selectedTickets.join(', ')}</p>
                </div>
                <div className="flex items-center gap-4">
                    <p className="text-white text-2xl font-bold">${totalCost.toLocaleString('es-MX')}</p>
                    <button onClick={clearSelection} className="bg-gray-600 text-white p-3 rounded-md hover:bg-gray-500" title="Limpiar selección">
                        <RefreshCw size={20} />
                    </button>
                    <button onClick={() => setShowReservationModal(true)} className="bg-brand-beige-rosy text-brand-darkest font-bold py-3 px-6 rounded-md hover:bg-opacity-90 transition-colors flex items-center gap-2">
                      <ShoppingCart size={20} />
                      Continuar
                    </button>
                </div>
            </div>
          </div>
        )}
      </main>
      <footer>{/* ... */}</footer>
    </div>
  );
}