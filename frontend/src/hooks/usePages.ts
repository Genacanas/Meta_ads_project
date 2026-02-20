import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PageData {
    page_id: string;
    name: string;
    country: string;
    total_eu_reach: number;
    beneficiary?: string; // New field
    top_creative?: {
        media_url: string;
        media_type: 'image' | 'video';
        snapshot_url?: string;
    };
}

export function usePages(
    filters: { country?: string; searchTerm?: string },
    page: number = 0,
    limit: number = 100
) {
    const [pages, setPages] = useState<PageData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // Reset pages when filters change (except pagination)
    useEffect(() => {
        setPages([]);
        setHasMore(true);
    }, [filters.country, filters.searchTerm]);

    useEffect(() => {
        async function fetchPages() {
            try {
                setLoading(true);
                setError(null);

                const isCountryFilterActive = filters.country && filters.country !== 'All';

                let query = supabase
                    .from('pages')
                    .select(`
            *,
            page_top_creatives!inner (
              media_url,
              media_type,
              ads (
                ad_snapshot_url
              )
            ),
            ads (
                beneficiary
            )
          `)
                    .order('total_eu_reach', { ascending: false })
                    .range(page * limit, (page + 1) * limit - 1);

                // Filter by Country using pages.country (set during Step 2 page discovery)
                if (isCountryFilterActive) {
                    query = query.eq('country', filters.country);
                }

                // Filter by Search Term (Page Name)
                if (filters.searchTerm) {
                    query = query.ilike('name', `%${filters.searchTerm}%`);
                }

                const { data, error } = await query;

                if (error) throw error;

                if (data.length < limit) {
                    setHasMore(false);
                }

                const formattedData = data.map((page: any) => {
                    // Get beneficiary from first ad match
                    // Since we joined via ads!inner, page.ads should be an array of matching ads
                    const firstAd = Array.isArray(page.ads) ? page.ads[0] : page.ads;
                    const beneficiary = firstAd?.beneficiary || null;

                    // page_top_creatives is One-to-One object
                    const rawCreative = Array.isArray(page.page_top_creatives) ? page.page_top_creatives[0] : page.page_top_creatives;

                    const snapshotAd = rawCreative?.ads;
                    const snapshotUrl = Array.isArray(snapshotAd) ? snapshotAd[0]?.ad_snapshot_url : snapshotAd?.ad_snapshot_url;

                    const top_creative = rawCreative ? {
                        media_url: rawCreative.media_url,
                        media_type: rawCreative.media_type ? rawCreative.media_type.toLowerCase() : 'image',
                        snapshot_url: snapshotUrl
                    } : null;

                    return {
                        ...page,
                        beneficiary,
                        top_creative,
                    };
                });

                setPages(prev => (page === 0 ? formattedData : [...prev, ...formattedData]));

            } catch (err: any) {
                console.error('Error fetching pages:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchPages();
    }, [filters.country, filters.searchTerm, page, limit]);

    return { pages, loading, error, hasMore };
}
