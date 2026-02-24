import { useEffect, useState } from 'react';

export function useCountries() {
    const [countries, setCountries] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Feature temporarily mocked out during backend switch
        setCountries([]);
    }, []);

    return { countries, loading };
}
