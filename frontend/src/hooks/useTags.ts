import { useContext } from 'react';
import { TagContext } from '../context/TagContext';

export interface Tag {
    Id: number;
    Name: string;
}

export function useTags() {
    const context = useContext(TagContext);
    
    if (context === undefined) {
        throw new Error('useTags must be used within a TagProvider');
    }
    
    return context;
}
