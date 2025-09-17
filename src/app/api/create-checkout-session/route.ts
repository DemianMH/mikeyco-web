import { NextResponse } from 'next/server';
import Stripe from 'stripe';

interface Ticket {
  number: number;
  price: number;
}

export async function POST(request: Request) {
  // --- INICIO DE CAMBIOS ---
  // Verificamos si la clave secreta de Stripe está configurada.
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: { message: 'El sistema de pago no está configurado por el administrador.' } },
      { status: 503 } // 503 Service Unavailable
    );
  }
  // --- FIN DE CAMBIOS ---

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { tickets, raffleId, raffleName, buyerInfo } = await request.json();

    const lineItems = tickets.map((ticket: Ticket) => ({
      price_data: {
        currency: 'mxn',
        product_data: {
          name: `${raffleName} - Boleto #${String(ticket.number).padStart(3, '0')}`,
        },
        unit_amount: ticket.price * 100, // Stripe usa centavos
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/`,
      metadata: {
        raffleId,
        ticketNumbers: JSON.stringify(tickets.map((t: Ticket) => t.number)),
        buyerName: buyerInfo.name,
        buyerEmail: buyerInfo.email,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    return NextResponse.json({ error: { message: errorMessage } }, { status: 500 });
  }
}