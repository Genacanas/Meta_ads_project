import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export interface PageData {
    page_id: string;
    name: string;
    country: string;
    total_eu_reach: number;
    manual_status: string; // New field for approval workflow ('unprocessed', 'saved', 'deleted')
    beneficiary?: string;
    tag?: string;
    tagId?: number;
    top_creative?: {
        media_url: string;
        media_type: 'image' | 'video';
        snapshot_url?: string;
    };
}

export function usePages(
    filters: { country?: string; category?: string; searchTerm?: string; status?: 'unprocessed' | 'saved' | 'deleted'; minReach?: number; tag?: string },
    page: number = 0,
    limit: number = 100
) {
    const [pages, setPages] = useState<PageData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const { country, category, searchTerm, status, minReach, tag } = filters;

    // Reset pages when filters change (except pagination)
    useEffect(() => {
        setPages([]);
        setHasMore(true);
    }, [country, category, searchTerm, status, minReach, tag]);

    useEffect(() => {
        let isMounted = true;

        async function fetchPages() {
            try {
                setLoading(true);
                setError(null);

                const currentStatus = status || 'unprocessed';

                // Build the query parameter string
                const queryParams = new URLSearchParams({
                    status: currentStatus,
                    limit: limit.toString(),
                    offset: (page * limit).toString()
                });

                if (country && country !== 'All') {
                    queryParams.append('country', country);
                }

                if (category && category !== 'All') {
                    queryParams.append('category', category);
                }

                if (searchTerm) {
                    queryParams.append('searchTerm', searchTerm);
                }

                if (minReach !== undefined && minReach !== null) {
                    queryParams.append('min_reach', minReach.toString());
                }

                if (tag && tag !== 'All') {
                    queryParams.append('tag', tag);
                }

                const data: PageData[] = await api.get(`/pages?${queryParams.toString()}`);

                if (!isMounted) return;

                if (data.length < limit) {
                    setHasMore(false);
                }

                setPages(prev => (page === 0 ? data : [...prev, ...data]));

            } catch (err: any) {
                if (isMounted) {
                    console.error('Error fetching pages:', err);
                    setError(err.message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchPages();

        return () => {
            isMounted = false;
        };
    }, [country, category, searchTerm, status, minReach, tag, page, limit]);

    return { pages, setPages, loading, error, hasMore };
}
