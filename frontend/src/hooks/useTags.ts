import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

export interface Tag {
    Id: number;
    Name: string;
}

export function useTags() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTags = useCallback(async () => {
        try {
            setLoading(true);
            const data: Tag[] = await api.get('/tags');
            setTags(data);
        } catch (err) {
            console.error("Failed to fetch tags:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    return { tags, loading, refetchTags: fetchTags };
}
