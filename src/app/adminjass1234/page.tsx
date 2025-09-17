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
    // --- NUEVO CAMPO PARA EL CONTEO DE BOLETOS VENDIDOS ---
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
    const [isLoading, setIsLoading] = useState(true); // Inicia en true
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

    // --- INICIO DE LA CORRECCIÓN: LÓGICA DE fetchRaffles AÑADIDA ---
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

                    return {
                        id: raffleId,
                        ...d.data(),
                        soldTicketsCount
                    } as Raffle;
                })
            );
            setRaffles(rafflesList);
        } catch (error) {
            console.error("Error al obtener las rifas:", error);
            // Si hay un error, asegúrate de que el estado de carga se desactive
        } finally {
            setIsLoading(false);
        }
    };
    // --- FIN DE LA CORRECCIÓN ---

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
        setIsLoading(true);
        const raffleDoc = await getDoc(doc(db, 'raffles', raffleId));
        if (raffleDoc.exists()) {
            const raffleData = { id: raffleDoc.id, ...raffleDoc.data() } as Raffle;
            setSelectedRaffle(raffleData);

            const ticketsCollection = collection(db, 'raffles', raffleId, 'tickets');
            const ticketSnapshot = await getDocs(ticketsCollection);
            const ticketsList = ticketSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));

            setSoldTickets(ticketsList.filter(t => t.status === 'sold'));
            setPendingTickets(ticketsList.filter(t => t.status === 'pending'));
            setWinner(null);
        } else {
            setSelectedRaffle(null);
            setSoldTickets([]);
            setPendingTickets([]);
        }
        setIsLoading(false);
    };

    const handleDrawWinner = () => {
        if (soldTickets.length === 0) {
            alert("No hay boletos vendidos para sortear.");
            return;
        }
        const randomIndex = Math.floor(Math.random() * soldTickets.length);
        const winningTicket = soldTickets[randomIndex];
        setWinner(winningTicket);
    };

    const handleNewRaffleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setNewRaffleData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleCreateRaffle = async (e: React.FormEvent) => {
        e.preventDefault();
        // ... (resto de la función sin cambios)
    };
    
    const handleActivateRaffle = async (raffleToActivate: Raffle) => {
        // ... (resto de la función sin cambios)
    };

    const handleConfirmPayment = async (ticket: Ticket) => {
        // ... (resto de la función sin cambios)
    };

    const handleCancelReservation = async (ticket: Ticket) => {
        // ... (resto de la función sin cambios)
    };

    return (
        <div className="container mx-auto p-8 bg-brand-darkest min-h-screen text-white">
            <header className="py-6 px-4 md:px-8 flex justify-center items-center mb-8">
                <Image src="/mikeyco-logo-largo-blanco.png" alt="Mike & Co Logo" width={300} height={100} priority />
            </header>
            <h1 className="text-4xl font-serif text-center mb-8">Panel de Administración de Rifas</h1>
            
            {/* ... (Todo el JSX se mantiene igual, pero ahora la lógica de fetchRaffles funciona) ... */}
            
            <div className="bg-brand-dark p-6 rounded-lg mb-8 border border-brand-olive">
                <h2 className="text-2xl font-serif mb-4">Seleccionar Rifa Existente</h2>
                {isLoading ? <p>Cargando rifas...</p> : (
                    <select onChange={(e) => handleSelectRaffle(e.target.value)} value={selectedRaffle?.id || ''} className="bg-brand-darkest p-2 rounded w-full border border-brand-olive text-white focus:outline-none focus:ring-2 focus:ring-brand-beige-rosy">
                        <option value="">Elige una rifa...</option>
                        {raffles.map(raffle => (
                            <option key={raffle.id} value={raffle.id}>
                                {raffle.productName} {raffle.isActive ? '(ACTIVA)' : ''} ({raffle.soldTicketsCount || 0} / {raffle.totalTickets} vendidos)
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* ... (El resto del JSX para mostrar detalles, pendientes, etc.) ... */}
        </div>
    );
}