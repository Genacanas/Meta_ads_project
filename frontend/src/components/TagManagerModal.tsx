import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { X, Edit2, Tag as TagIcon, ArrowRight, Trash2, Check, Loader2 } from 'lucide-react';
import { useTags, Tag } from '../hooks/useTags';

interface TagManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTagsChanged: () => void;
}

export function TagManagerModal({ isOpen, onClose, onTagsChanged }: TagManagerModalProps) {
    const [activeTab, setActiveTab] = useState<'rename' | 'bulk_replace'>('rename');
    const { tags, loading, refetchTags } = useTags();

    // Rename Tab State
    const [editingTagId, setEditingTagId] = useState<number | null>(null);
    const [editingTagName, setEditingTagName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Bulk Replace Tab State
    const [sourceTagId, setSourceTagId] = useState<number | "">("");
    const [targetTagId, setTargetTagId] = useState<number | "">("");
    const [deleteSource, setDeleteSource] = useState(false);
    const [isReplacing, setIsReplacing] = useState(false);

    // Global messaging
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (isOpen) {
            refetchTags();
            setMessage(null);
            setEditingTagId(null);
            setSourceTagId("");
            setTargetTagId("");
            setDeleteSource(false);
        }
    }, [isOpen, refetchTags]);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleSaveRename = async (tagId: number) => {
        if (!editingTagName.trim()) return;
        setIsSaving(true);
        try {
            await api.patch(`/tags/${tagId}`, { name: editingTagName.trim() });
            setMessage({ text: "Tag renamed successfully!", type: 'success' });
            setEditingTagId(null);
            refetchTags();
            onTagsChanged();
        } catch (error: any) {
            console.error("Failed to rename tag", error);
            setMessage({ text: error.message || "Failed to rename tag.", type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkReplace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (sourceTagId === "" || targetTagId === "") return;
        if (sourceTagId === targetTagId) {
            setMessage({ text: "Source and Target tags cannot be the same.", type: 'error' });
            return;
        }

        const sourceName = tags.find(t => t.Id === sourceTagId)?.Name;
        const targetName = tags.find(t => t.Id === targetTagId)?.Name;

        if (!confirm(`Are you sure you want to replace all '${sourceName}' tags with '${targetName}'?${deleteSource ? `\n\nWARNING: The tag '${sourceName}' will be permanently deleted!` : ''}`)) {
            return;
        }

        setIsReplacing(true);
        try {
            await api.post('/tags/bulk-replace', {
                sourceTagId: Number(sourceTagId),
                targetTagId: Number(targetTagId),
                deleteSource
            });
            setMessage({ text: "Tags replaced successfully!", type: 'success' });
            setSourceTagId("");
            setTargetTagId("");
            setDeleteSource(false);
            refetchTags();
            onTagsChanged();
        } catch (error: any) {
            console.error("Failed to replace tags", error);
            setMessage({ text: error.message || "Failed to replace tags.", type: 'error' });
        } finally {
            setIsReplacing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={headerStyle}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', color: '#1e293b' }}>
                        <TagIcon size={20} className="text-blue-600" />
                        Tag Manager
                    </h2>
                    <button onClick={onClose} style={closeBtnStyle}><X size={24} /></button>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                    <button
                        onClick={() => setActiveTab('rename')}
                        style={tabStyle(activeTab === 'rename')}
                    >
                        Rename Tags
                    </button>
                    <button
                        onClick={() => setActiveTab('bulk_replace')}
                        style={tabStyle(activeTab === 'bulk_replace')}
                    >
                        Bulk Replace
                    </button>
                </div>

                <div style={contentStyle}>
                    {message && (
                        <div style={{
                            padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
                            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                            color: message.type === 'success' ? '#166534' : '#991b1b',
                            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`
                        }}>
                            {message.text}
                        </div>
                    )}

                    {loading && <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}><Loader2 className="animate-spin inline mr-2" size={18} /> Loading tags...</div>}

                    {!loading && activeTab === 'rename' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#64748b' }}>
                                Edit tag names globally. The change will reflect on all pages currently using the tag.
                            </p>
                            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                {tags.length === 0 ? (
                                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No tags available.</p>
                                ) : (
                                    tags.map(tag => (
                                        <div key={tag.Id} style={tagItemRowStyle}>
                                            {editingTagId === tag.Id ? (
                                                <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
                                                    <input
                                                        autoFocus
                                                        value={editingTagName}
                                                        onChange={(e) => setEditingTagName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveRename(tag.Id);
                                                            if (e.key === 'Escape') setEditingTagId(null);
                                                        }}
                                                        style={inputStyle}
                                                    />
                                                    <button
                                                        onClick={() => handleSaveRename(tag.Id)}
                                                        disabled={isSaving || !editingTagName.trim() || editingTagName === tag.Name}
                                                        style={saveIconBtnStyle}
                                                    >
                                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                                                    </button>
                                                    <button onClick={() => setEditingTagId(null)} style={cancelIconBtnStyle}>
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span style={{ fontWeight: '500', color: '#334155' }}>{tag.Name}</span>
                                                    <button
                                                        onClick={() => {
                                                            setEditingTagId(tag.Id);
                                                            setEditingTagName(tag.Name);
                                                            setMessage(null);
                                                        }}
                                                        style={editIconBtnStyle}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'bulk_replace' && (
                        <div>
                            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                                Move all pages from one tag to another. This is useful for merging duplicate tracking tags or fixing typos across many pages at once.
                            </p>
                            <form onSubmit={handleBulkReplace} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Original Tag (Source)</label>
                                        <select
                                            value={sourceTagId}
                                            onChange={(e) => setSourceTagId(e.target.value === "" ? "" : Number(e.target.value))}
                                            style={selectStyle}
                                            required
                                        >
                                            <option value="" disabled>Select original tag...</option>
                                            {tags.map(t => <option key={t.Id} value={t.Id}>{t.Name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ paddingTop: '22px', color: '#94a3b8' }}>
                                        <ArrowRight size={24} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Replacement Tag (Target)</label>
                                        <select
                                            value={targetTagId}
                                            onChange={(e) => setTargetTagId(e.target.value === "" ? "" : Number(e.target.value))}
                                            style={selectStyle}
                                            required
                                        >
                                            <option value="" disabled>Select target tag...</option>
                                            {tags.map(t => <option key={t.Id} value={t.Id}>{t.Name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '12px', backgroundColor: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: '6px' }}>
                                    <input
                                        type="checkbox"
                                        id="deleteSource"
                                        checked={deleteSource}
                                        onChange={(e) => setDeleteSource(e.target.checked)}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="deleteSource" style={{ fontSize: '13px', color: '#be123c', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Trash2 size={14} /> Also delete the original tag completely
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isReplacing || sourceTagId === "" || targetTagId === "" || sourceTagId === targetTagId}
                                    style={bulkSubmitBtnStyle}
                                >
                                    {isReplacing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    Apply Bulk Replace
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ------ Styles ------
const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(2px)'
};
const modalStyle: React.CSSProperties = {
    backgroundColor: '#fff', borderRadius: '12px', width: '560px', maxWidth: '95%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh'
};
const headerStyle: React.CSSProperties = {
    padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0'
};
const closeBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', transition: 'color 0.2s'
};
const contentStyle: React.CSSProperties = {
    padding: '24px', display: 'flex', flexDirection: 'column', overflowY: 'auto'
};
const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1, padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600',
    backgroundColor: isActive ? '#ffffff' : '#f1f5f9',
    color: isActive ? '#3b82f6' : '#64748b',
    border: 'none', borderBottom: isActive ? '2px solid #3b82f6' : '1px solid #e2e8f0',
    cursor: 'pointer', transition: 'all 0.2s'
});
const tagItemRowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px',
    marginBottom: '8px', backgroundColor: '#f8fafc'
};
const inputStyle: React.CSSProperties = {
    flex: 1, padding: '6px 10px', border: '2px solid #3b82f6', borderRadius: '4px',
    fontSize: '14px', outline: 'none'
};
const editIconBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px'
};
const saveIconBtnStyle: React.CSSProperties = {
    background: '#22c55e', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', padding: '6px'
};
const cancelIconBtnStyle: React.CSSProperties = {
    background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: '4px', cursor: 'pointer', padding: '6px'
};
const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px'
};
const selectStyle: React.CSSProperties = {
    width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1',
    backgroundColor: '#fff', fontSize: '14px', color: '#1e293b', outline: 'none'
};
const bulkSubmitBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    width: '100%', padding: '12px', backgroundColor: '#3b82f6', color: 'white',
    border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '600',
    cursor: 'pointer', marginTop: '8px', transition: 'background-color 0.2s'
};
