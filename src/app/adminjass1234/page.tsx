'use client'
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, addDoc, query, where, writeBatch, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
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

export default function AdminPage() {
    const [raffles, setRaffles] = useState<Raffle[]>([]);
    const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
    const [soldTickets, setSoldTickets] = useState<Ticket[]>([]);
    const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
    const [winner, setWinner] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDrawing, setIsDrawing] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // --- NUEVA ESTRUCTURA DE PAQUETES CON BOLETOS DE REGALO ---
    const defaultPackages: TicketPackage[] = [
        { code: 'Normal', price: 150, paidTickets: 1, freeTickets: 0, totalTickets: 1, displayText: '1 boleto por $150' },
        { code: '5X', price: 500, paidTickets: 5, freeTickets: 1, totalTickets: 6, displayText: 'Paga 5 boletos y llévate 6 (1 de regalo)' },
        { code: 'VIP10', price: 1050, paidTickets: 10, freeTickets: 3, totalTickets: 13, displayText: 'Paga 10 boletos y llévate 13 (3 de regalo)' },
        { code: 'VIP20', price: 2000, paidTickets: 20, freeTickets: 6, totalTickets: 26, displayText: 'Paga 20 boletos y llévate 26 (6 de regalo)' },
        { code: 'VIP50', price: 5000, paidTickets: 50, freeTickets: 15, totalTickets: 65, displayText: 'Paga 50 boletos y llévate 65 (15 de regalo)' },
        { code: 'VIP500', price: 55000, paidTickets: 500, freeTickets: 150, totalTickets: 650, displayText: 'Paga 500 boletos y llévate 650 (150 de regalo)' }
    ];

    const [newRaffleData, setNewRaffleData] = useState({
        productName: '',
        title: '',
        description: '',
        watchInfo: '',
        imageUrl: '',
        totalTickets: 2000,
        isActive: false,
        ticketPackages: defaultPackages
    });

    const fetchRaffles = async () => {
        // ... (sin cambios)
    };

    useEffect(() => {
        fetchRaffles();
    }, []);

    const handleSelectRaffle = async (raffleId: string) => {
        // ... (sin cambios)
    };

    const handleDrawWinner = () => {
        // ... (sin cambios)
    };

    const handleNewRaffleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setNewRaffleData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) || 0 : value)
        }));
    };

    // --- LÓGICA PARA CREAR RIFAS AHORA FUNCIONAL ---
    const handleCreateRaffle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRaffleData.productName || !newRaffleData.title || newRaffleData.totalTickets <= 0) {
            alert("Por favor, completa los campos obligatorios: Nombre, Título y Total de Boletos.");
            return;
        }
        setIsLoading(true);
        try {
            // Si la nueva rifa será la activa, desactivamos todas las demás primero
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
            setNewRaffleData({ // Resetear formulario
                productName: '', title: '', description: '', watchInfo: '', imageUrl: '', totalTickets: 2000, isActive: false, ticketPackages: defaultPackages
            });
            await fetchRaffles(); // Recargar la lista de rifas
        } catch (error) {
            console.error("Error al crear la rifa:", error);
            alert("Hubo un error al crear la rifa.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleActivateRaffle = async (raffleToActivate: Raffle) => {
        // ... (sin cambios)
    };

    const handleConfirmPayment = async (ticket: Ticket) => {
        // ... (sin cambios)
    };



    const handleCancelReservation = async (ticket: Ticket) => {
        // ... (sin cambios)
    };

    return (
        <div className="container mx-auto p-8 bg-brand-darkest min-h-screen text-white">
            <header className="py-6 px-4 md:px-8 flex justify-center items-center mb-8">
                <Image src="/mikeyco-logo-largo-blanco.png" alt="Mike & Co Logo" width={300} height={100} priority />
            </header>
            <h1 className="text-4xl font-serif text-center mb-8">Panel de Administración de Rifas</h1>
            
            {/* --- BOTÓN PARA CREAR RIFAS AHORA VISIBLE --- */}
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
                        {/* Aquí va el formulario completo para crear la rifa */}
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
                {/* ... (resto del panel sin cambios) ... */}
            </div>

            {selectedRaffle && (
              <div className="bg-brand-dark p-6 rounded-lg border border-brand-olive">
                {/* ... (resto del panel sin cambios) ... */}
              </div>
            )}
        </div>
    );
}