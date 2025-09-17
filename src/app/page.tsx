import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import RaffleClient from './RaffleClient';

interface TicketPackage {
  code: string;
  tickets: number;
  price: number;
  priceText: string;
}

interface Raffle {
  id: string;
  productName: string;
  title: string;
  description: string;
  imageUrl: string;
  totalTickets: number;
  isActive: boolean;
  ticketPackages: TicketPackage[];
}


export default async function RifaPage() {
  let raffleData: Raffle | null = null;

  try {
    const rafflesCollection = collection(db, 'raffles');
    // Creamos una consulta para encontrar la rifa con el campo isActive = true
    const q = query(rafflesCollection, where("isActive", "==", true), limit(1));
    const raffleSnapshot = await getDocs(q);

    if (!raffleSnapshot.empty) {
      const raffleDoc = raffleSnapshot.docs[0];
      // Combinamos el ID del documento con sus datos
      raffleData = { id: raffleDoc.id, ...raffleDoc.data() } as Raffle;
    }
  } catch (error) {
    console.error("Error al obtener la rifa activa desde Firestore:", error);
  }

  // Si no se encuentra ninguna rifa activa, mostramos un mensaje
  if (!raffleData) {
    return (
      <div className="min-h-screen bg-brand-darkest flex items-center justify-center text-white text-center p-4">
        <div>
          <h1 className="text-4xl font-serif mb-4">No hay rifas activas</h1>
          <p className="text-xl text-brand-gray">Por favor, vuelve más tarde.</p>
        </div>
      </div>
    );
  }
  
  // Si se encuentra, pasamos los datos de Firestore al componente cliente
  return <RaffleClient raffleData={raffleData} />;
}