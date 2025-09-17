'use client'
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    query,
    where,
    writeBatch // Importa writeBatch para la función handleCreateRaffle
} from 'firebase/firestore';
import Image from 'next/image';

// Define una interfaz para los datos de la rifa
interface Raffle {
    id: string;
    productName: string;
    title: string;
    description: string;
    imageUrl: string;
    totalTickets: number;
    isActive: boolean;
    ticketPackages: { code: string; tickets: number; price: number; priceText: string }[];
    soldTicketsCount: number; // Esto se calculará, no se guarda directamente en el doc principal
}

interface Ticket {
    number: number;
    buyerName: string;
    buyerEmail: string;
}

export default function AdminPage() {
    const [raffles, setRaffles] = useState<Raffle[]>([]);
    const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
    const [soldTickets, setSoldTickets] = useState<Ticket[]>([]);
    const [winner, setWinner] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newRaffleData, setNewRaffleData] = useState<Partial<Raffle>>({
        productName: '',
        title: '',
        description: '',
        imageUrl: '',
        totalTickets: 0,
        isActive: false,
        ticketPackages: [
          { code: 'Normal', tickets: 1, price: 150, priceText: '$150 MXN' },
          { code: '5X', tickets: 5, price: 500, priceText: '$500 MXN' },
          { code: 'VIP10', tickets: 10, price: 1000, priceText: '$1,000 MXN' }
        ]
    });

    const fetchRaffles = async () => {
        setIsLoading(true);
        const rafflesCollection = collection(db, 'raffles');
        const raffleSnapshot = await getDocs(rafflesCollection);
        const rafflesList = await Promise.all(
            raffleSnapshot.docs.map(async d => {
                const raffleId = d.id;
                const ticketsCollection = collection(db, 'raffles', raffleId, 'tickets');
                const ticketsSnapshot = await getDocs(ticketsCollection);
                const soldTicketsCount = ticketsSnapshot.size;

                return {
                    id: raffleId,
                    ...d.data(),
                    soldTicketsCount
                } as Raffle;
            })
        );
        setRaffles(rafflesList);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchRaffles();
    }, []);

    const handleSelectRaffle = async (raffleId: string) => {
        setIsLoading(true);
        const raffleDoc = await getDoc(doc(db, 'raffles', raffleId));
        if (raffleDoc.exists()) {
            setSelectedRaffle({ id: raffleDoc.id, ...raffleDoc.data() } as Raffle);

            const ticketsCollection = collection(db, 'raffles', raffleId, 'tickets');
            const ticketSnapshot = await getDocs(ticketsCollection);
            const ticketsList = ticketSnapshot.docs.map(doc => doc.data() as Ticket);
            setSoldTickets(ticketsList);
            setWinner(null);
        } else {
            setSelectedRaffle(null);
            setSoldTickets([]);
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
        const { name, value, type, checked } = e.target as HTMLInputElement;

        setNewRaffleData(prev => {
            let newValue: string | number | boolean = value;

            if (type === 'checkbox') {
                newValue = checked;
            } else if (type === 'number') {
                // Si el valor es una cadena vacía, queremos que sea 0, no NaN
                newValue = value === '' ? 0 : parseInt(value);
            }

            return {
                ...prev,
                [name]: newValue
            };
        });
    };

    const handleCreateRaffle = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (newRaffleData.isActive) {
                const activeRafflesQuery = query(collection(db, 'raffles'), where("isActive", "==", true));
                const activeRafflesSnapshot = await getDocs(activeRafflesQuery);
                const batch = writeBatch(db); // Usar writeBatch
                activeRafflesSnapshot.docs.forEach(doc => {
                    batch.update(doc.ref, { isActive: false });
                });
                await batch.commit();
            }

            const docRef = await addDoc(collection(db, 'raffles'), newRaffleData);
            alert(`Rifa "${newRaffleData.productName}" creada con ID: ${docRef.id}`);
            setShowCreateForm(false);
            setNewRaffleData({
                productName: '', title: '', description: '', imageUrl: '', totalTickets: 0, isActive: false,
                ticketPackages: [
                  { code: 'Normal', tickets: 1, price: 150, priceText: '$150 MXN' },
                  { code: '5X', tickets: 5, price: 500, priceText: '$500 MXN' },
                  { code: 'VIP10', tickets: 10, price: 1000, priceText: '$1,000 MXN' }
                ]
            });
            fetchRaffles();
        } catch (error) {
            console.error("Error al crear la rifa:", error);
            alert("Hubo un error al crear la rifa.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleActivateRaffle = async (raffleToActivate: Raffle) => {
        setIsLoading(true);
        try {
            // Primero desactiva todas las rifas activas
            const activeRafflesQuery = query(collection(db, 'raffles'), where("isActive", "==", true));
            const activeRafflesSnapshot = await getDocs(activeRafflesQuery);
            const batch = writeBatch(db);
            activeRafflesSnapshot.docs.forEach(docSnap => {
                batch.update(docSnap.ref, { isActive: false });
            });
            // Activa la rifa seleccionada
            const raffleRef = doc(db, 'raffles', raffleToActivate.id);
            batch.update(raffleRef, { isActive: true });
            await batch.commit();

            alert(`Rifa "${raffleToActivate.productName}" activada.`);
            fetchRaffles();
            setSelectedRaffle(prev => prev ? { ...prev, isActive: prev.id === raffleToActivate.id } : null);
        } catch (error) {
            console.error("Error al activar la rifa:", error);
            alert("Hubo un error al activar la rifa.");
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
                    {showCreateForm ? 'Ocultar Formulario de Nueva Rifa' : 'Crear Nueva Rifa'}
                </button>
            </div>

            {showCreateForm && (
                <div className="bg-brand-dark p-6 rounded-lg mb-8 border border-brand-olive">
                    <h2 className="text-2xl font-serif mb-4">Crear Nueva Rifa</h2>
                    <form onSubmit={handleCreateRaffle} className="space-y-4">
                        <div>
                            <label className="block text-brand-beige-light text-sm font-bold mb-2">
                                Nombre del Producto (interno):
                            </label>
                            <input
                                type="text"
                                name="productName"
                                value={newRaffleData.productName}
                                onChange={handleNewRaffleChange}
                                className="bg-brand-darkest text-white border border-brand-olive rounded w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-beige-rosy"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-brand-beige-light text-sm font-bold mb-2">
                                Título (para el público):
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={newRaffleData.title}
                                onChange={handleNewRaffleChange}
                                className="bg-brand-darkest text-white border border-brand-olive rounded w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-beige-rosy"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-brand-beige-light text-sm font-bold mb-2">
                                Descripción:
                            </label>
                            <textarea
                                name="description"
                                value={newRaffleData.description}
                                onChange={handleNewRaffleChange}
                                className="bg-brand-darkest text-white border border-brand-olive rounded w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-beige-rosy h-24"
                                required
                            ></textarea>
                        </div>
                        <div>
                            <label className="block text-brand-beige-light text-sm font-bold mb-2">
                                URL de la Imagen (ej. /reloj-rifa.png):
                            </label>
                            <input
                                type="text"
                                name="imageUrl"
                                value={newRaffleData.imageUrl}
                                onChange={handleNewRaffleChange}
                                className="bg-brand-darkest text-white border border-brand-olive rounded w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-beige-rosy"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-brand-beige-light text-sm font-bold mb-2">
                                Total de Boletos:
                            </label>
                            <input
                                type="number"
                                name="totalTickets"
                                value={newRaffleData.totalTickets}
                                onChange={handleNewRaffleChange}
                                min="1"
                                className="bg-brand-darkest text-white border border-brand-olive rounded w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-beige-rosy"
                                required
                            />
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={newRaffleData.isActive}
                                onChange={handleNewRaffleChange}
                                className="form-checkbox h-5 w-5 text-brand-beige-rosy rounded border-brand-olive bg-brand-darkest focus:ring-brand-beige-rosy"
                            />
                            <label className="ml-2 block text-brand-beige-light text-sm font-bold">
                                Activar esta rifa (desactivará cualquier otra activa)
                            </label>
                        </div>

                        <h3 className="text-xl font-serif mt-6 mb-2">Paquetes de Boletos (Fijos por ahora)</h3>
                        {newRaffleData.ticketPackages?.map((pkg, index) => (
                            <div key={index} className="flex space-x-2 items-center bg-brand-darkest p-3 rounded-md border border-brand-olive">
                                <span className="text-brand-beige-light">{pkg.code} ({pkg.tickets} boletos):</span>
                                <span className="text-brand-beige-rosy font-bold">{pkg.priceText}</span>
                            </div>
                        ))}


                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg text-lg disabled:bg-gray-500 w-full flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                'Crear Rifa'
                            )}
                        </button>
                    </form>
                </div>
            )}

            <div className="bg-brand-dark p-6 rounded-lg mb-8 border border-brand-olive">
                <h2 className="text-2xl font-serif mb-4">Seleccionar Rifa Existente</h2>
                {isLoading ? (
                    <p className="text-brand-beige-light">Cargando rifas...</p>
                ) : (
                    <select
                        onChange={(e) => handleSelectRaffle(e.target.value)}
                        className="bg-brand-darkest p-2 rounded w-full border border-brand-olive text-white focus:outline-none focus:ring-2 focus:ring-brand-beige-rosy"
                        value={selectedRaffle?.id || ''}
                    >
                        <option value="">Elige una rifa...</option>
                        {raffles.map(raffle => (
                            <option key={raffle.id} value={raffle.id}>
                                {raffle.productName} {raffle.isActive ? '(ACTIVA)' : ''} ({raffle.soldTicketsCount} / {raffle.totalTickets} vendidos)
                            </option>
                        ))}
                    </select>
                )}
                 {selectedRaffle && !selectedRaffle.isActive && (
                    <button
                        onClick={() => handleActivateRaffle(selectedRaffle)}
                        disabled={isLoading}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:bg-gray-500"
                    >
                        Activar esta Rifa
                    </button>
                )}
            </div>

            {selectedRaffle && !isLoading && (
                <div className="bg-brand-dark p-6 rounded-lg border border-brand-olive">
                    <h2 className="text-3xl font-serif mb-4 flex items-center gap-2">
                        {selectedRaffle.productName}
                        {selectedRaffle.isActive && <span className="text-green-400 text-sm">(ACTIVA)</span>}
                    </h2>
                    <p className="text-xl mb-2">Boletos Vendidos: {soldTickets.length} / {selectedRaffle.totalTickets}</p>
                    <p className="text-lg text-brand-beige-light mb-4">Título Público: {selectedRaffle.title}</p>
                    <p className="text-lg text-brand-beige-light mb-4">Descripción: {selectedRaffle.description}</p>
                    <div className="mb-6">
                        <h3 className="font-semibold text-white">Paquetes:</h3>
                        <ul>
                            {selectedRaffle.ticketPackages?.map((pkg, index) => (
                                <li key={index} className="text-brand-beige-light ml-4">- {pkg.code}: {pkg.tickets} boletos por {pkg.priceText}</li>
                            ))}
                        </ul>
                    </div>

                    <button
                        onClick={handleDrawWinner}
                        disabled={soldTickets.length === 0 || isLoading}
                        className="bg-brand-beige-rosy hover:bg-opacity-90 text-brand-darkest font-bold py-3 px-6 rounded-lg text-lg disabled:bg-gray-500 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-brand-darkest" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            '¡Sortear Ganador!'
                        )}
                    </button>

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