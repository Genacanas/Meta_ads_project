import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export interface Tag {
    Id: number;
    Name: string;
}

export function useTags() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function fetchTags() {
            try {
                setLoading(true);
                const data: Tag[] = await api.get('/tags');
                if (isMounted) {
                    setTags(data);
                }
            } catch (err) {
                console.error("Failed to fetch tags:", err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchTags();

        return () => {
            isMounted = false;
        };
    }, []);

    return { tags, loading };
}
