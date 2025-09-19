'use client'
import { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, addDoc, query, where, writeBatch, deleteDoc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import Image from 'next/image';

interface TicketPackage {
    code: string;
    price: number;
    paidTickets: number;
    freeTickets: number;
    totalTickets: number;
    displayText: string;
}

interface Raffle {
    id: string;
    productName: string;
    title: string;
    description: string;
    imageUrl: string;
    watchInfo?: string;
    totalTickets: number;
    isActive: boolean;
    ticketPackages: TicketPackage[];
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

interface GroupedTickets {
    [key: string]: Ticket[];
}

export default function AdminPage() {
    const [raffles, setRaffles] = useState<Raffle[]>([]);
    const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
    const [soldTickets, setSoldTickets] = useState<Ticket[]>([]);
    const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
    const [winner, setWinner] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDrawing, setIsDrawing] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const defaultPackages: TicketPackage[] = [
        { code: 'Normal', price: 150, paidTickets: 1, freeTickets: 0, totalTickets: 1, displayText: '1 boleto por $150' },
        { code: '5X', price: 500, paidTickets: 5, freeTickets: 1, totalTickets: 6, displayText: 'Paga 5 boletos y llévate 6 (1 de regalo)' },
        { code: 'VIP10', price: 1050, paidTickets: 10, freeTickets: 3, totalTickets: 13, displayText: 'Paga 10 boletos y llévate 13 (3 de regalo)' },
        { code: 'VIP20', price: 2000, paidTickets: 20, freeTickets: 6, totalTickets: 26, displayText: 'Paga 20 boletos y llévate 26 (6 de regalo)' },
        { code: 'VIP50', price: 5000, paidTickets: 50, freeTickets: 15, totalTickets: 65, displayText: 'Paga 50 boletos y llévate 65 (15 de regalo)' },
        { code: 'VIP500', price: 55000, paidTickets: 500, freeTickets: 150, totalTickets: 650, displayText: 'Paga 500 boletos y llévate 650 (150 de regalo)' }
    ];

    const [newRaffleData, setNewRaffleData] = useState({
        productName: '', title: '', description: '', watchInfo: '', imageUrl: '', totalTickets: 2000, isActive: false, ticketPackages: defaultPackages
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
            } finally {
                setIsLoading(false);
            }
        }
    };

    const groupedPendingTickets = useMemo(() => {
        return pendingTickets.reduce((acc, ticket) => {
            const key = ticket.buyerEmail;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(ticket);
            return acc;
        }, {} as GroupedTickets);
    }, [pendingTickets]);


    const handleDrawWinner = () => {
        if (soldTickets.length === 0) {
            alert("No hay boletos vendidos para sortear.");
            return;
        }
        setIsDrawing(true);
        setWinner(null);
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
        setNewRaffleData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) || 0 : value)
        }));
    };

    const handleCreateRaffle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRaffleData.productName || !newRaffleData.title || newRaffleData.totalTickets <= 0) {
            alert("Por favor, completa los campos obligatorios: Nombre, Título y Total de Boletos.");
            return;
        }
        setIsLoading(true);
        try {
            if (newRaffleData.isActive) {
                const activeRafflesQuery = query(collection(db, 'raffles'), where("isActive", "==", true));
                const activeRafflesSnapshot = await getDocs(activeRafflesQuery);
                const batch = writeBatch(db);
                activeRafflesSnapshot.docs.forEach(doc => {
                    batch.update(doc.ref, { isActive: false });
                });
                await batch.commit();
            }

            await addDoc(collection(db, 'raffles'), newRaffleData);
            alert(`Rifa "${newRaffleData.productName}" creada exitosamente.`);
            setShowCreateForm(false);
            setNewRaffleData({
                productName: '', title: '', description: '', watchInfo: '', imageUrl: '', totalTickets: 2000, isActive: false, ticketPackages: defaultPackages
            });
            await fetchRaffles();
        } catch (error) {
            console.error("Error al crear la rifa:", error);
            alert("Hubo un error al crear la rifa.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmAll = async (ticketsToConfirm: Ticket[]) => {
        if (!selectedRaffle) return;
        const buyerName = ticketsToConfirm[0]?.buyerName;
        if (!confirm(`¿Estás seguro de confirmar TODOS los ${ticketsToConfirm.length} boletos de ${buyerName}?`)) return;

        setIsLoading(true);
        try {
            const batch = writeBatch(db);
            const now = Timestamp.now();
            ticketsToConfirm.forEach(ticket => {
                const ticketRef = doc(db, 'raffles', selectedRaffle.id, 'tickets', ticket.id);
                batch.update(ticketRef, { status: 'sold', purchaseDate: now });
            });
            await batch.commit();
            alert('¡Todos los boletos fueron confirmados!');
            await handleSelectRaffle(selectedRaffle.id);
        } catch (error) {
            console.error("Error al confirmar el bloque de pagos:", error);
            alert("Hubo un error al confirmar los pagos.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelAll = async (ticketsToDelete: Ticket[]) => {
        if (!selectedRaffle) return;
        const buyerName = ticketsToDelete[0]?.buyerName;
        if (!confirm(`¿Estás seguro de cancelar TODAS las ${ticketsToDelete.length} reservas de ${buyerName}?`)) return;

        setIsLoading(true);
        try {
            const batch = writeBatch(db);
            ticketsToDelete.forEach(ticket => {
                const ticketRef = doc(db, 'raffles', selectedRaffle.id, 'tickets', ticket.id);
                batch.delete(ticketRef);
            });
            await batch.commit();
            alert('¡Todas las reservas fueron canceladas!');
            await handleSelectRaffle(selectedRaffle.id);
        } catch (error) {
            console.error("Error al cancelar el bloque de reservas:", error);
            alert("Hubo un error al cancelar las reservas.");
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
            
            <div className="flex justify-center mb-8">
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="bg-brand-beige-rosy text-brand-darkest font-bold py-2 px-6 rounded-lg hover:bg-opacity-90 transition-colors"
                >
                    {showCreateForm ? 'Ocultar Formulario' : 'Crear Nueva Rifa'}
                </button>
            </div>

            {showCreateForm && (
                <div className="bg-brand-dark p-6 rounded-lg mb-8 border border-brand-olive">
                    <h2 className="text-2xl font-serif mb-4">Crear Nueva Rifa</h2>
                    <form onSubmit={handleCreateRaffle} className="space-y-4">
                        <div>
                            <label className="block text-brand-beige-light text-sm font-bold mb-2">Nombre del Producto (interno)</label>
                            <input type="text" name="productName" value={newRaffleData.productName} onChange={handleNewRaffleChange} className="w-full bg-brand-darkest p-2 rounded border border-brand-olive" required />
                        </div>
                        <div>
                            <label className="block text-brand-beige-light text-sm font-bold mb-2">Título (público)</label>
                            <input type="text" name="title" value={newRaffleData.title} onChange={handleNewRaffleChange} className="w-full bg-brand-darkest p-2 rounded border border-brand-olive" required />
                        </div>
                        <div>
                            <label className="block text-brand-beige-light text-sm font-bold mb-2">Descripción</label>
                            <textarea name="description" value={newRaffleData.description} onChange={handleNewRaffleChange} className="w-full bg-brand-darkest p-2 rounded border border-brand-olive h-24"></textarea>
                        </div>
                        <div>
                            <label className="block text-brand-beige-light text-sm font-bold mb-2">Información del Reloj</label>
                            <textarea name="watchInfo" value={newRaffleData.watchInfo} onChange={handleNewRaffleChange} className="w-full bg-brand-darkest p-2 rounded border border-brand-olive h-32"></textarea>
                        </div>
                        <div>
                            <label className="block text-brand-beige-light text-sm font-bold mb-2">URL de la Imagen</label>
                            <input type="text" name="imageUrl" value={newRaffleData.imageUrl} onChange={handleNewRaffleChange} className="w-full bg-brand-darkest p-2 rounded border border-brand-olive" />
                        </div>
                        <div>
                            <label className="block text-brand-beige-light text-sm font-bold mb-2">Total de Boletos</label>
                            <input type="number" name="totalTickets" value={newRaffleData.totalTickets} onChange={handleNewRaffleChange} className="w-full bg-brand-darkest p-2 rounded border border-brand-olive" required />
                        </div>
                         <div className="flex items-center">
                            <input type="checkbox" name="isActive" checked={newRaffleData.isActive} onChange={handleNewRaffleChange} className="h-4 w-4" />
                            <label className="ml-2 text-brand-beige-light">Activar esta rifa (desactivará las demás)</label>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500">
                            {isLoading ? 'Creando...' : 'Guardar Rifa'}
                        </button>
                    </form>
                </div>
            )}
            
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
                    <div className="space-y-6">
                      {Object.entries(groupedPendingTickets).map(([email, tickets]) => (
                        <div key={email} className="bg-brand-darkest p-4 rounded-lg border border-yellow-600">
                          <div className="flex flex-wrap justify-between items-center mb-3">
                            <div>
                              <p className="font-bold text-lg">{tickets[0].buyerName}</p>
                              <p className="text-sm text-gray-400">{email}</p>
                            </div>
                            <div className="flex gap-2 mt-2 sm:mt-0">
                                <button onClick={() => handleConfirmAll(tickets)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md text-sm">Confirmar Todos ({tickets.length})</button>
                                <button onClick={() => handleCancelAll(tickets)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-md text-sm">Cancelar Todos ({tickets.length})</button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 border-t border-brand-olive pt-3">
                            <span className="text-sm font-semibold text-brand-beige-light mr-2">Boletos:</span>
                            {tickets.sort((a,b) => a.number - b.number).map(ticket => (
                                <span key={ticket.id} className="bg-yellow-800 text-yellow-200 text-sm font-mono py-1 px-2 rounded-md">
                                    {String(ticket.number).padStart(3, '0')}
                                </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-8 border-t border-brand-olive pt-8">
                    <h3 className="text-2xl font-serif mb-4 text-brand-beige-rosy">Realizar Sorteo</h3>
                    <button
                        onClick={handleDrawWinner}
                        disabled={soldTickets.length === 0 || isLoading || isDrawing}
                        className="bg-brand-beige-rosy hover:bg-opacity-90 text-brand-darkest font-bold py-3 px-6 rounded-lg text-lg disabled:bg-gray-500 w-full flex items-center justify-center gap-2"
                    >
                        {isDrawing ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-brand-darkest" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Sorteando...
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