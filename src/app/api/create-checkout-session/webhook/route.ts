import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(request: Request) {
    const signature = request.headers.get('stripe-signature');
    let event;

    try {
        const body = await request.text();
        event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { raffleId, ticketNumbers, buyerName, buyerEmail } = session.metadata!;

        try {
            const parsedTicketNumbers = JSON.parse(ticketNumbers);
            
            // Usar un batch para escribir todos los boletos en una sola operación
            const batch = writeBatch(db);
            parsedTicketNumbers.forEach((number: number) => {
                const ticketRef = doc(db, 'raffles', raffleId, 'tickets', String(number));
                batch.set(ticketRef, {
                    number,
                    buyerName,
                    buyerEmail,
                    purchaseDate: new Date(),
                });
            });

            await batch.commit();

        } catch (error) {
            console.error("Error al guardar boletos:", error);
            return new NextResponse('Error al procesar la compra', { status: 500 });
        }
    }

    return NextResponse.json({ received: true });
}