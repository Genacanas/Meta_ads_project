import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { X, Plus, Trash2, Tag as TagIcon } from 'lucide-react';

export interface Tag {
    Id: number;
    Name: string;
}

interface TagSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    currentTagId?: number;
    currentTagName?: string;
    pageId: string;
    onTagUpdate: (tagId: number | null, tagName: string | null) => void;
}

export function TagSelector({ isOpen, onClose, currentTagId, currentTagName, pageId, onTagUpdate }: TagSelectorProps) {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchTags();
        }
    }, [isOpen]);

    const fetchTags = async () => {
        try {
            setLoading(true);
            const data = await api.get('/tags');
            setTags(data);
        } catch (error) {
            console.error("Failed to fetch tags", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTag = async (tag: Tag) => {
        try {
            await api.patch(`/pages/${pageId}/tag`, { tagId: tag.Id, tagName: tag.Name });
            onTagUpdate(tag.Id, tag.Name);
            onClose();
        } catch (error) {
            console.error("Failed to update page tag", error);
            alert("Error updating tag.");
        }
    };

    const handleClearTag = async () => {
        try {
            await api.patch(`/pages/${pageId}/tag`, { tagId: null, tagName: null });
            onTagUpdate(null, null);
            onClose();
        } catch (error) {
            console.error("Failed to clear page tag", error);
            alert("Error clearing tag.");
        }
    };

    const handleCreateTag = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        const trimmedName = newTagName.trim();
        if (!trimmedName) return;

        // Validation: Verify if it already exists (case-insensitive)
        const existingTag = tags.find(t => t.Name.toLowerCase() === trimmedName.toLowerCase());
        if (existingTag) {
            setErrorMsg("A tag with this name already exists.");
            return;
        }

        try {
            setIsCreating(true);
            const newTag = await api.post('/tags', { name: trimmedName });

            // Protect against adding duplicates to state if API returned existing
            const isAlreadyInList = tags.some(t => t.Id === newTag.Id);
            if (!isAlreadyInList) {
                setTags([...tags, newTag]);
            }

            // Automatically select it after creation
            await handleSelectTag(newTag);

            setNewTagName('');
        } catch (error) {
            console.error("Failed to create tag", error);
            setErrorMsg("Error creating tag. May already exist.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteTag = async (e: React.MouseEvent, tagId: number) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to completely delete this tag from the system?")) return;

        try {
            await api.delete(`/tags/${tagId}`);
            setTags(tags.filter(t => t.Id !== tagId));

            // If the local page had this tag, visually clear it too
            if (currentTagId === tagId) {
                onTagUpdate(null, null);
            }
        } catch (error) {
            console.error("Failed to delete tag", error);
            alert("Error deleting tag.");
        }
    };

    if (!isOpen) return null;

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={headerStyle}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}>
                        <TagIcon size={18} /> Select Tag
                    </h3>
                    <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
                </div>

                <div style={contentStyle}>
                    {currentTagName && (
                        <div style={currentTagContainerStyle}>
                            <span style={{ fontSize: '12px', color: '#666' }}>Current Tag:</span>
                            <div style={activeTagPillStyle}>
                                {currentTagName}
                                <button onClick={handleClearTag} style={clearTagBtnStyle} title="Remove tag from this page">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleCreateTag} style={createFormStyle}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Add new tag..."
                                value={newTagName}
                                onChange={(e) => {
                                    setNewTagName(e.target.value);
                                    if (errorMsg) setErrorMsg(null); // Clear error when typing
                                }}
                                style={inputStyle}
                            />
                            {errorMsg && (
                                <div style={errorBannerStyle}>
                                    {errorMsg}
                                </div>
                            )}
                        </div>
                        <button type="submit" disabled={isCreating || !newTagName.trim()} style={addBtnStyle}>
                            <Plus size={18} />
                        </button>
                    </form>

                    <div style={listStyle}>
                        {loading ? (
                            <p style={{ textAlign: 'center', color: '#888', padding: '10px' }}>Loading tags...</p>
                        ) : tags.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#888', padding: '10px' }}>No tags yet. Create one above!</p>
                        ) : (
                            tags.map(tag => (
                                <div
                                    key={tag.Id}
                                    style={tagItemStyle(tag.Id === currentTagId)}
                                    onClick={() => handleSelectTag(tag)}
                                >
                                    <span
                                        style={{
                                            flex: 1,
                                            fontWeight: tag.Id === currentTagId ? 'bold' : 'normal',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                        title={tag.Name}
                                    >
                                        {tag.Name}
                                    </span>
                                    <button
                                        onClick={(e) => handleDeleteTag(e, tag.Id)}
                                        style={trashBtnStyle}
                                        title="Permanently delete tag"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Inline styles for high customizability and portability to be replaced by css modules if needed
const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
};
const modalStyle: React.CSSProperties = {
    backgroundColor: '#fff', borderRadius: '8px', width: '480px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', maxHeight: '80vh'
};
const headerStyle: React.CSSProperties = {
    padding: '12px 16px', borderBottom: '1px solid #eee',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f8f9fa'
};
const closeBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '4px'
};
const contentStyle: React.CSSProperties = {
    padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto'
};
const currentTagContainerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px'
};
const activeTagPillStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    backgroundColor: '#dbeafe', color: '#1e40af', padding: '6px 10px',
    borderRadius: '16px', fontSize: '14px', fontWeight: '500', width: 'fit-content'
};
const clearTagBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af',
    display: 'flex', alignItems: 'center', padding: 0, marginTop: '2px'
};
const createFormStyle: React.CSSProperties = {
    display: 'flex', gap: '8px'
};
const inputStyle: React.CSSProperties = {
    flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px'
};
const addBtnStyle: React.CSSProperties = {
    backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px',
    padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center'
};
const listStyle: React.CSSProperties = {
    display: 'flex', flexWrap: 'wrap', gap: '8px', overflowY: 'auto', maxHeight: '250px'
};
const tagItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', padding: '6px 10px', borderRadius: '4px',
    width: 'calc(33.333% - 6px)', boxSizing: 'border-box',
    backgroundColor: isActive ? '#e0f2fe' : '#ffffff', // Light blue background when active
    color: isActive ? '#0369a1' : '#1f2937', // Dark blue text when active, solid dark gray otherwise
    cursor: 'pointer', fontSize: '13px', border: '1px solid',
    borderColor: isActive ? '#bae6fd' : '#e5e7eb',
    transition: 'background-color 0.2s, color 0.2s'
});
const trashBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
    padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.7
};
const errorBannerStyle: React.CSSProperties = {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
    backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '11px', fontWeight: '500',
    padding: '4px 8px', borderRadius: '4px', border: '1px solid #fca5a5', zIndex: 10
};
