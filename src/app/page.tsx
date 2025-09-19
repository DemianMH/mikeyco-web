import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import RaffleClient from './RaffleClient';

export const dynamic = 'force-dynamic';

// --- INICIO DE CORRECCIÓN: Se actualizan las interfaces para que coincidan ---
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
}
// --- FIN DE CORRECCIÓN ---


export default async function RifaPage() {
  let raffleData: Raffle | null = null;

  try {
    const rafflesCollection = collection(db, 'raffles');
    const q = query(rafflesCollection, where("isActive", "==", true), limit(1));
    const raffleSnapshot = await getDocs(q);

    if (!raffleSnapshot.empty) {
      const raffleDoc = raffleSnapshot.docs[0];
      raffleData = { id: raffleDoc.id, ...raffleDoc.data() } as Raffle;
    }
  } catch (error) {
    console.error("Error al obtener la rifa activa desde Firestore:", error);
  }

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
  
  return <RaffleClient raffleData={raffleData} />;
}