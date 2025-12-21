// services/configService.ts
import { createClient } from '@vercel/edge-config';

const config = createClient(process.env.EDGE_CONFIG);

export async function getDrawSchedule() {
    try {
        const schedule = await config.get('drawSchedule');
        return schedule || {
            mediodia: '12:55:00',
            tarde: '16:30:00',
            noche: '19:30:00'
        };
    } catch (error) {
        console.error('Edge Config Error:', error);
        return {
            mediodia: '12:55:00',
            tarde: '16:30:00',
            noche: '19:30:00'
        };
    }
}
