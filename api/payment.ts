import Stripe from 'stripe';

// Using provided test key as fallback for immediate functionality
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
});

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { amount, currency = 'crc' } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to cents/centimos
            currency,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
