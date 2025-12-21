
import { useState, useEffect, useRef } from 'react';
import { api } from '../services/edgeApi';
import { DrawResult, DrawTime } from '../types';

export function useLiveResults() {
    const [results, setResults] = useState<DrawResult[]>([]);
    const [history, setHistory] = useState<DrawResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(false);

    // Poll every 15 seconds for live updates
    useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await api.getLiveResults();
                if (res.data) {
                    setResults(res.data.results);
                    setHistory(res.data.history);
                    setIsOffline(false);
                }
            } catch (e) {
                console.error('Failed to fetch live results', e);
                setIsOffline(true);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
        const interval = setInterval(fetchResults, 15000);

        window.addEventListener('online', fetchResults);
        window.addEventListener('offline', () => setIsOffline(true));

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', fetchResults);
            window.removeEventListener('offline', () => setIsOffline(true));
        };
    }, []);

    const getResultByDraw = (drawTime: DrawTime) => {
        return results.find(r => r.drawTime === drawTime);
    };

    return {
        results,
        history,
        loading,
        isOffline,
        getResultByDraw
    };
}
