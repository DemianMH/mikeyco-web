'use client'
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, addDoc, query, where, writeBatch, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import Image from 'next/image';

// --- ESTRUCTURA DE PAQUETES CORRECTA Y FINAL ---
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

    // ... (El resto de las funciones como fetchRaffles, handleSelectRaffle, etc., no cambian y deben permanecer como estaban)
}