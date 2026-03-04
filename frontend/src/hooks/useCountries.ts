import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function useCountries() {
    const [countries, setCountries] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function fetchCountries() {
            try {
                setLoading(true);
                const data: string[] = await api.get('/countries');
                if (isMounted) {
                    setCountries(data);
                }
            } catch (err) {
                console.error("Failed to fetch countries:", err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchCountries();

        return () => {
            isMounted = false;
        };
    }, []);

    return { countries, loading };
}
