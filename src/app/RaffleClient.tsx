'use client'

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Instagram, MessageSquare, X, ShoppingCart, Copy, AlertCircle, RefreshCw } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, writeBatch, Timestamp, doc } from 'firebase/firestore';

// --- NUEVA ESTRUCTURA DE PAQUETES ---
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
  const [selectedPackage, setSelectedPackage] = useState<TicketPackage | null>(null);

  useEffect(() => {
    // ... (sin cambios)
  }, [raffleData.id]);

  const totalCost = useMemo(() => {
    return selectedPackage ? selectedPackage.price : 0;
  }, [selectedPackage]);

  const handleCreateReservation = async (buyerInfo: { name: string; email: string }) => {
    // ... (sin cambios)
  };

  // --- LÓGICA DE SELECCIÓN DE PAQUETES Y BOLETOS ALEATORIOS ---
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
    setSelectedPackage(pkg);
  };

  const clearSelection = () => {
    setSelectedTickets([]);
    setSelectedPackage(null);
  };

  const ReservationModal = () => {
    // --- NÚMERO DE WHATSAPP ACTUALIZADO ---
    // ... (El resto del modal no cambia, solo el número de WhatsApp)
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
        <form /* ... */ >
           {/* ... */}
              <div className="bg-yellow-900 border border-yellow-600 text-yellow-200 p-3 rounded-lg flex gap-2 items-start">
                <AlertCircle size={24} className="flex-shrink-0 mt-1"/>
                <p className="text-sm">Una vez realizado el pago, envía tu comprobante junto con los números de boleto y tu nombre al WhatsApp <a href="https://wa.me/523317417313" target="_blank" className="font-bold underline">33 1741 7313</a> para confirmar tu compra.</p>
              </div>
           {/* ... */}
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-darkest">
      {showReservationModal && <ReservationModal />}
      <header /* ... */ ></header>
      <main className="px-4 md:px-8">
        <section id="hero" /* ... */ >
           {/* ... (sin cambios) ... */}
        </section>

        {/* --- SECCIÓN DE PAQUETES TOTALMENTE RENOVADA --- */}
        <section id="packages" className="py-12 max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-white text-center mb-8">Paquetes y Precios</h2>
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

        <section id="tickets" className="py-12 max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-white text-center mb-8">Tus Números Seleccionados</h2>
          {selectedTickets.length > 0 ? (
            <div className="bg-brand-dark p-4 rounded-lg">
              <p className="text-brand-beige-light text-center">Estos son los números que se han seleccionado aleatoriamente para ti:</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {selectedTickets.map(num => (
                  <span key={num} className="bg-brand-beige-rosy text-brand-darkest font-bold py-1 px-3 rounded-md">
                    {String(num).padStart(3, '0')}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-brand-gray">Selecciona un paquete de la lista de arriba para que se te asignen tus boletos.</p>
          )}
        </section>

        {selectedTickets.length > 0 && (
          <div className="sticky bottom-0 left-0 right-0 bg-brand-dark bg-opacity-90 backdrop-blur-sm p-4 z-40">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="font-bold text-white text-lg">Paquete {selectedPackage?.code} seleccionado</h3>
                    <p className="text-brand-beige-light text-sm">{selectedTickets.length} boletos asignados</p>
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
      <footer /* ... */ ></footer>
    </div>
  );
}