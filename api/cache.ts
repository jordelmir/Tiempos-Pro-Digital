import { Redis } from '@upstash/redis';

export const config = {
    runtime: 'edge',
};

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(req: Request) {
    try {
        const url = new URL(req.url);
        const key = url.searchParams.get('key');
        const value = url.searchParams.get('value');
        const ttl = url.searchParams.get('ttl'); // seconds

        if (!key) return new Response('Missing key', { status: 400 });

        if (req.method === 'GET') {
            const data = await redis.get(key);
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (req.method === 'POST') {
            if (!value) return new Response('Missing value', { status: 400 });
            await redis.set(key, value, { ex: Number(ttl) || 300 }); // Default 5 mins
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        return new Response('Method not allowed', { status: 405 });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
