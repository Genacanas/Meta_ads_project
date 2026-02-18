import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useCountries() {
    const [countries, setCountries] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCountries() {
            try {
                // Fetch distinct countries from search_terms
                const { data, error } = await supabase
                    .from('search_terms')
                    .select('country')
                    .order('country');

                if (error) throw error;

                // Extract unique countries
                const uniqueCountries = Array.from(new Set(data.map((item: any) => item.country)));
                setCountries(uniqueCountries);
            } catch (err) {
                console.error('Error fetching countries:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchCountries();
    }, []);

    return { countries, loading };
}
