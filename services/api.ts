// services/api.ts
import { createUserAction } from './actions/users';
import { placeBetAction } from './actions/betting';
// Import other actions as needed

export const api = {
    createUser: async (payload: any) => {
        const res = await createUserAction(payload);
        return res;
    },
    placeBet: async (payload: any) => {
        const res = await placeBetAction(payload);
        return res;
    },
    // Placeholder for others to maintain compatibility with legacy components
    publishDrawResult: async (payload: any) => ({ error: 'Not implemented in Next.js version yet' }),
    maintenance: {
        analyzePurge: async (payload: any) => ({ data: { recordCount: 0, estimatedSizeKB: 0, riskLevel: 'LOW', description: 'Simulación' } }),
        executePurge: async (payload: any) => ({ data: { count: 0 } }),
    },
    checkIdentity: async (payload: any) => ({ data: null }),
};
