'use client'
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc, addDoc, query, where, writeBatch, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import Image from 'next/image';

interface Raffle {
    id: string;
    productName: string;
    title: string;
    description: string;
    imageUrl: string;
    watchInfo?: string;
    totalTickets: number;
    isActive: boolean;
    ticketPackages: { code: string; tickets: number; price: number; priceText: string }[];
    soldTicketsCount?: number;
}

interface Ticket {
    id: string;
    number: number;
    buyerName: string;
    buyerEmail: string;
    status: 'sold' | 'pending';
    reservationTimestamp?: Timestamp;
    purchaseDate?: Timestamp;
}

export default function AdminPage() {
    const [raffles, setRaffles] = useState<Raffle[]>([]);
    const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
    const [soldTickets, setSoldTickets] = useState<Ticket[]>([]);
    const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
    const [winner, setWinner] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDrawing, setIsDrawing] = useState(false); // Nuevo estado para el sorteo
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newRaffleData, setNewRaffleData] = useState<Partial<Raffle>>({
        productName: '',
        title: '',
        description: '',
        watchInfo: '',
        imageUrl: '',
        totalTickets: 0,
        isActive: false,
        ticketPackages: [
            { code: 'Normal', tickets: 1, price: 150, priceText: '$150 MXN' },
            { code: '5X', tickets: 5, price: 600, priceText: '$600 MXN' },
            { code: 'VIP10', tickets: 10, price: 1150, priceText: '$1,150 MXN' },
            { code: 'VIP50', tickets: 50, price: 5000, priceText: '$5,000 MXN' }
        ]
    });

    const fetchRaffles = async () => {
        setIsLoading(true);
        try {
            const rafflesCollection = collection(db, 'raffles');
            const raffleSnapshot = await getDocs(rafflesCollection);
            const rafflesList = await Promise.all(
                raffleSnapshot.docs.map(async d => {
                    const raffleId = d.id;
                    const ticketsQuery = query(collection(db, 'raffles', raffleId, 'tickets'), where("status", "==", "sold"));
                    const ticketsSnapshot = await getDocs(ticketsQuery);
                    const soldTicketsCount = ticketsSnapshot.size;
                    return { id: d.id, ...d.data(), soldTicketsCount } as Raffle;
                })
            );
            setRaffles(rafflesList);
        } catch (error) {
            console.error("Error al obtener las rifas:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRaffles();
    }, []);

    const handleSelectRaffle = async (raffleId: string) => {
        if (!raffleId) {
          setSelectedRaffle(null);
          setSoldTickets([]);
          setPendingTickets([]);
          return;
        }

        const selected = raffles.find(r => r.id === raffleId);

        if (selected) {
            setIsLoading(true);
            setSelectedRaffle(selected);

            try {
                const ticketsCollection = collection(db, 'raffles', raffleId, 'tickets');
                const ticketSnapshot = await getDocs(ticketsCollection);
                const ticketsList = ticketSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
                
                setSoldTickets(ticketsList.filter(t => t.status === 'sold'));
                setPendingTickets(ticketsList.filter(t => t.status === 'pending'));
                setWinner(null);
            } catch (error) {
                console.error("Error al obtener los boletos:", error);
                alert("No se pudieron cargar los boletos para esta rifa.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleDrawWinner = () => {
        if (soldTickets.length === 0) {
            alert("No hay boletos vendidos para sortear.");
            return;
        }
        
        setIsDrawing(true);
        setWinner(null); // Ocultamos al ganador anterior si lo hubiera

        // Simula un redoble de tambores durante 3 segundos
        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * soldTickets.length);
            const winningTicket = soldTickets[randomIndex];
            setWinner(winningTicket);
            setIsDrawing(false);
        }, 3000);
    };

    const handleNewRaffleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setNewRaffleData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleCreateRaffle = async (e: React.FormEvent) => {
        e.preventDefault();
        // Lógica para crear una nueva rifa
    };
    
    const handleActivateRaffle = async (raffleToActivate: Raffle) => {
        // Lógica para activar una rifa
    };

    const handleConfirmPayment = async (ticket: Ticket) => {
        if (!selectedRaffle) return;
        if (!confirm(`¿Estás seguro de confirmar el pago para el boleto #${ticket.number} de ${ticket.buyerName}?`)) return;

        setIsLoading(true);
        try {
            const ticketRef = doc(db, 'raffles', selectedRaffle.id, 'tickets', ticket.id);
            await updateDoc(ticketRef, { status: 'sold', purchaseDate: Timestamp.now() });
            alert('¡Pago confirmado! El boleto ha sido marcado como vendido.');
            await handleSelectRaffle(selectedRaffle.id); // Recargar datos
        } catch (error) {
            console.error("Error al confirmar el pago:", error);
            alert("Hubo un error al confirmar el pago.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelReservation = async (ticket: Ticket) => {
        if (!selectedRaffle) return;
        if (!confirm(`¿Estás seguro de cancelar la reserva del boleto #${ticket.number} de ${ticket.buyerName}? El boleto volverá a estar disponible.`)) return;

        setIsLoading(true);
        try {
            const ticketRef = doc(db, 'raffles', selectedRaffle.id, 'tickets', ticket.id);
            await deleteDoc(ticketRef);
            alert('¡Reserva cancelada! El boleto está disponible de nuevo.');
            await handleSelectRaffle(selectedRaffle.id);
        } catch (error) {
            console.error("Error al cancelar la reserva:", error);
            alert("Hubo un error al cancelar la reserva.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-8 bg-brand-darkest min-h-screen text-white">
            <header className="py-6 px-4 md:px-8 flex justify-center items-center mb-8">
                <Image src="/mikeyco-logo-largo-blanco.png" alt="Mike & Co Logo" width={300} height={100} priority />
            </header>
            <h1 className="text-4xl font-serif text-center mb-8">Panel de Administración de Rifas</h1>
            
            <div className="bg-brand-dark p-6 rounded-lg mb-8 border border-brand-olive">
                <h2 className="text-2xl font-serif mb-4">Seleccionar Rifa Existente</h2>
                {isLoading && !selectedRaffle ? <p>Cargando rifas...</p> : (
                    <select
                        onChange={(e) => handleSelectRaffle(e.target.value)}
                        value={selectedRaffle?.id || ''}
                        className="bg-brand-darkest p-2 rounded w-full border border-brand-olive text-white focus:outline-none focus:ring-2 focus:ring-brand-beige-rosy"
                    >
                        <option value="">Elige una rifa...</option>
                        {raffles.map(raffle => (
                            <option key={raffle.id} value={raffle.id}>
                                {raffle.productName} {raffle.isActive ? '(ACTIVA)' : ''} ({raffle.soldTicketsCount || 0} / {raffle.totalTickets} vendidos)
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {selectedRaffle && (
              <div className="bg-brand-dark p-6 rounded-lg border border-brand-olive">
                <h2 className="text-3xl font-serif mb-4">{selectedRaffle.productName}</h2>
                <p className="text-xl mb-2">Boletos Vendidos: {soldTickets.length} / {selectedRaffle.totalTickets}</p>
                <p className="text-xl mb-4">Boletos Pendientes: {pendingTickets.length}</p>

                {isLoading && <p>Cargando boletos...</p>}
                
                {!isLoading && pendingTickets.length > 0 && (
                  <div className="my-8">
                    <h3 className="text-2xl font-serif mb-4 text-yellow-400">Reservas Pendientes de Confirmación</h3>
                    <div className="space-y-4">
                      {pendingTickets.sort((a,b) => a.number - b.number).map(ticket => (
                        <div key={ticket.id} className="bg-brand-darkest p-4 rounded-lg flex flex-wrap justify-between items-center gap-4 border border-yellow-600">
                          <div>
                            <p className="font-bold text-lg">Boleto #{String(ticket.number).padStart(3, '0')}</p>
                            <p className="text-sm text-brand-beige-light">{ticket.buyerName} - {ticket.buyerEmail}</p>
                            <p className="text-xs text-gray-400">Reservado el: {ticket.reservationTimestamp?.toDate().toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleConfirmPayment(ticket)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md text-sm">Confirmar Pago</button>
                            <button onClick={() => handleCancelReservation(ticket)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-md text-sm">Cancelar Reserva</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-8">
                    <button
                        onClick={handleDrawWinner}
                        disabled={soldTickets.length === 0 || isLoading || isDrawing}
                        className="bg-brand-beige-rosy hover:bg-opacity-90 text-brand-darkest font-bold py-3 px-6 rounded-lg text-lg disabled:bg-gray-500 w-full flex items-center justify-center gap-2"
                    >
                        {isDrawing ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-brand-darkest" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                'Sorteando...'
                            </>
                        ) : (
                            '¡Sortear Ganador!'
                        )}
                    </button>
                </div>

                {winner && (
                    <div className="mt-8 p-6 bg-yellow-400 text-black rounded-lg text-center">
                        <h3 className="text-2xl font-bold">¡El ganador es!</h3>
                        <p className="text-5xl font-bold my-4">{winner.number.toString().padStart(3, '0')}</p>
                        <p className="text-xl">Comprado por: {winner.buyerName}</p>
                        <p className="text-md">{winner.buyerEmail}</p>
                    </div>
                )}
              </div>
            )}
        </div>
    );
}