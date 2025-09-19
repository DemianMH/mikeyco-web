'use client'

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Instagram, MessageSquare, X, ShoppingCart, Copy, AlertCircle, RefreshCw } from 'lucide-react';
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
  buyerName?: string;
  buyerEmail?: string;
  reservationTimestamp?: Timestamp;
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
  // --- CAMBIO: De un solo paquete a un array de paquetes (carrito) ---
  const [selectedPackages, setSelectedPackages] = useState<TicketPackage[]>([]);

  useEffect(() => {
    const ticketsCollection = collection(db, 'raffles', raffleData.id, 'tickets');
    const unsubscribe = onSnapshot(ticketsCollection, (snapshot) => {
      const ticketsList = snapshot.docs.map(doc => doc.data() as Ticket);
      setUnavailableTickets(ticketsList);
    });
    return () => unsubscribe();
  }, [raffleData.id]);

  // --- CAMBIO: El costo total ahora suma los precios de todos los paquetes en el carrito ---
  const totalCost = useMemo(() => {
    // Si se seleccionan paquetes, el costo es la suma de los paquetes
    if (selectedPackages.length > 0) {
        return selectedPackages.reduce((total, pkg) => total + pkg.price, 0);
    }
    // Si la selección es manual, calculamos el precio por cantidad
    const numTickets = selectedTickets.length;
    if (numTickets === 0) return 0;
    const fifties = Math.floor(numTickets / 50);
    let remaining = numTickets % 50;
    const twenties = Math.floor(remaining / 20);
    remaining %= 20;
    const tens = Math.floor(remaining / 10);
    remaining %= 10;
    const fives = Math.floor(remaining / 5);
    const singles = remaining % 5;
    return (fifties * 5000) + (twenties * 2000) + (tens * 1050) + (fives * 500) + (singles * 150);
  }, [selectedTickets, selectedPackages]);

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
      clearSelection();
      setShowReservationModal(false);
    } catch (error) {
      console.error("Error al crear la reservación:", error);
      alert("Hubo un error al reservar tus boletos. Por favor, intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePackageSelection = (pkg: TicketPackage) => {
    const allTicketNumbers = Array.from({ length: raffleData.totalTickets }, (_, i) => i + 1);
    const unavailableNumbers = unavailableTickets.map(t => t.number);
    const availableTickets = allTicketNumbers.filter(num => !unavailableNumbers.includes(num));

    if (pkg.totalTickets > availableTickets.length) {
      alert(`No hay suficientes boletos disponibles para este paquete. Solo quedan ${availableTickets.length}.`);
      return;
    }

    const shuffled = availableTickets.sort(() => 0.5 - Math.random());
    const randomSelection = shuffled.slice(0, pkg.totalTickets).sort((a, b) => a - b);
    
    setSelectedTickets(randomSelection);
    setSelectedPackages([pkg]); // Reemplaza la selección con el paquete
  };

  const clearSelection = () => {
    setSelectedTickets([]);
    setSelectedPackages([]);
  };
  
  // --- CAMBIO: Se reactiva la selección manual de boletos ---
  const handleTicketClick = (ticketNumber: number) => {
    if (unavailableTickets.some(t => t.number === ticketNumber)) return;
    
    // Si se había seleccionado un paquete, se limpia para empezar una selección manual
    if (selectedPackages.length > 0) {
        clearSelection();
    }

    setSelectedTickets((prev) =>
      prev.includes(ticketNumber)
        ? prev.filter((t) => t !== ticketNumber)
        : [...prev, ticketNumber].sort((a,b) => a - b)
    );
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
                <button type="button" onClick={() => setShowReservationModal(false)} className="absolute top-4 right-4 text-brand-beige-light hover:text-white"><X size={24} /></button>
                <h2 className="font-serif text-3xl text-center text-white mb-2">Reservar Boletos</h2>
                <p className="text-center text-brand-beige-light mb-6">Completa tus datos para reservar tus números. La reservación es válida por 24 horas.</p>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        {/* ... Datos de pago ... */}
                    </div>
                    <div className="space-y-4">
                        {/* ... Datos del comprador ... */}
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
          <h2 className="font-serif text-3xl md:text-4xl text-white text-center mb-8">Elige tu Paquete (Selección Aleatoria)</h2>
          <div className="space-y-3">
            {raffleData.ticketPackages.map((pkg) => (
              <div key={pkg.code} className="bg-brand-dark border border-brand-olive rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold text-white text-lg">{pkg.code}</h3>
                  <p className="text-brand-beige-light">{pkg.displayText}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xl text-brand-beige-rosy font-bold">${pkg.price.toLocaleString('es-MX')} MXN</p>
                  <button
                    onClick={() => handlePackageSelection(pkg)}
                    className="bg-brand-beige-rosy text-brand-darkest font-bold py-2 px-4 rounded-md hover:bg-opacity-90 transition-colors"
                  >
                    Seleccionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- CAMBIO: La cuadrícula ahora está siempre visible --- */}
        <section id="tickets" className="py-12 max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-white text-center mb-8">O Elige tus Números Manualmente</h2>
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
        </section>

        {selectedTickets.length > 0 && (
          <div className="sticky bottom-0 left-0 right-0 bg-brand-dark bg-opacity-90 backdrop-blur-sm p-4 z-40">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="font-bold text-white text-lg">
                        {selectedPackages.length > 0 ? `Paquete ${selectedPackages[0].code} seleccionado` : `${selectedTickets.length} boleto(s) seleccionado(s)`}
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
      <footer className="mt-20 py-10 px-4 md:px-8 border-t border-brand-olive">
          {/* ... (footer sin cambios) ... */}
      </footer>
    </div>
  );
}