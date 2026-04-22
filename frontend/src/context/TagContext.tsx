import React, { createContext, useState, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api';

export interface Tag {
    Id: number;
    Name: string;
}

interface TagContextType {
    tags: Tag[];
    loading: boolean;
    isLoaded: boolean;
    ensureTagsLoaded: () => Promise<void>;
    refreshTags: () => Promise<void>;
    addTagLocally: (tag: Tag) => void;
    removeTagLocally: (tagId: number) => void;
    updateTagLocally: (tagId: number, newName: string) => void;
}

export const TagContext = createContext<TagContextType | undefined>(undefined);

export const TagProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const fetchTags = async () => {
        try {
            setLoading(true);
            const data: Tag[] = await api.get('/tags');
            setTags(data);
            setIsLoaded(true);
        } catch (err) {
            console.error("Failed to fetch tags:", err);
        } finally {
            setLoading(false);
        }
    };

    const ensureTagsLoaded = useCallback(async () => {
        if (!isLoaded && !loading) {
            await fetchTags();
        }
    }, [isLoaded, loading]);

    const refreshTags = useCallback(async () => {
        await fetchTags();
    }, []);

    const addTagLocally = useCallback((tag: Tag) => {
        setTags(prev => {
            if (prev.some(t => t.Id === tag.Id)) return prev;
            return [...prev, tag].sort((a, b) => a.Name.localeCompare(b.Name));
        });
    }, []);

    const removeTagLocally = useCallback((tagId: number) => {
        setTags(prev => prev.filter(t => t.Id !== tagId));
    }, []);

    const updateTagLocally = useCallback((tagId: number, newName: string) => {
        setTags(prev => {
            const updated = prev.map(t => t.Id === tagId ? { ...t, Name: newName } : t);
            return updated.sort((a, b) => a.Name.localeCompare(b.Name));
        });
    }, []);

    return (
        <TagContext.Provider value={{
            tags,
            loading,
            isLoaded,
            ensureTagsLoaded,
            refreshTags,
            addTagLocally,
            removeTagLocally,
            updateTagLocally
        }}>
            {children}
        </TagContext.Provider>
    );
};
