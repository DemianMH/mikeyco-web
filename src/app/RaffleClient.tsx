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
  const [selectedPackage, setSelectedPackage] = useState<TicketPackage | null>(null);

  useEffect(() => {
    const ticketsCollection = collection(db, 'raffles', raffleData.id, 'tickets');
    const unsubscribe = onSnapshot(ticketsCollection, (snapshot) => {
      const ticketsList = snapshot.docs.map(doc => doc.data() as Ticket);
      setUnavailableTickets(ticketsList);
    });
    return () => unsubscribe();
  }, [raffleData.id]);

  const totalCost = useMemo(() => {
    return selectedPackage ? selectedPackage.price : 0;
  }, [selectedPackage]);

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
      setSelectedPackage(null);
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
    setSelectedPackage(pkg);
  };

  const clearSelection = () => {
    setSelectedTickets([]);
    setSelectedPackage(null);
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
          <h2 className="font-serif text-3xl md:text-4xl text-white text-center mb-8">Elige tu Paquete</h2>
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
            <a href="https://wa.me/523317417313" target="_blank" className="font-bold underline">
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