import { X, Check, RotateCcw, Tag as TagIcon, Brain, Loader2 } from 'lucide-react';
import styles from './AdCard.module.css';
import { TagSelector } from './TagSelector';
import { useState } from 'react';
import { api } from '../lib/api';

interface AdCardProps {
    pageId: string;
    pageName: string;
    beneficiary?: string;
    totalReach: number;
    activeReach?: number;
    activeAdsCount?: number;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    snapshotUrl?: string;
    tagId?: number;
    tagName?: string;
    onStatusChange?: (pageId: string, status: 'saved' | 'deleted' | 'unprocessed') => void;
    onTagUpdate?: (pageId: string, newTagId: number | null, newTagName: string | null) => void;
    currentTab?: 'unprocessed' | 'saved' | 'deleted';
}

export function AdCard({
    pageId,
    pageName,
    beneficiary,
    totalReach,
    activeReach,
    activeAdsCount,
    mediaUrl,
    mediaType,
    snapshotUrl,
    tagId,
    tagName,
    onStatusChange,
    onTagUpdate,
    currentTab = 'unprocessed'
}: AdCardProps) {
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
    const [explanationText, setExplanationText] = useState("");
    const [isExplanationLoading, setIsExplanationLoading] = useState(false);
    const [explanationError, setExplanationError] = useState("");

    const formattedReach = new Intl.NumberFormat('en-US', {
        notation: "compact",
        compactDisplay: "short"
    }).format(totalReach);

    const formattedActiveReach = activeReach != null
        ? new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(activeReach)
        : null;

    const handleCardClick = () => {
        if (snapshotUrl) {
            window.open(snapshotUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const handleExplainClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExplainModalOpen(true);
        if (explanationText) return; // Note refetch if already fetched

        setIsExplanationLoading(true);
        setExplanationError("");
        try {
            const data = await api.post('/explain_company', { page_name: pageName });
            setExplanationText(data.explanation);
        } catch (err: any) {
            setExplanationError(err.message || "Failed to fetch explanation.");
        } finally {
            setIsExplanationLoading(false);
        }
    };

    return (
        <div className={styles.card} onClick={handleCardClick} style={{ cursor: snapshotUrl ? 'pointer' : 'default' }}>
            {/* Header info */}
            <div className={styles.header}>
                <div className={styles.titleRow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 className={styles.pageName}>
                        <a
                            href={`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=page&view_all_page_id=${pageId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={styles.pageLink}
                        >
                            {pageName}
                        </a>
                    </h3>
                    <button
                        onClick={handleExplainClick}
                        className={styles.actionBtn}
                        title="What does this company do?"
                        style={{ marginLeft: '8px', color: '#6366f1', background: 'none', border: '1px solid #e2e8f0', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}
                    >
                        <Brain size={18} />
                    </button>
                </div>
                <div className={styles.actionRow} style={{ marginTop: '8px' }}>
                    <div className={styles.infoCol}>
                        <span className={styles.reach}>{formattedReach}</span>
                        {/* Active reach & ad count badges */}
                        {(formattedActiveReach != null || activeAdsCount != null) && (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                {formattedActiveReach != null && (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                                        background: '#dcfce7', color: '#15803d',
                                        fontSize: '11px', fontWeight: '600',
                                        borderRadius: '8px', padding: '2px 7px',
                                        border: '1px solid #bbf7d0'
                                    }}>
                                        ▶ {formattedActiveReach}
                                    </span>
                                )}
                                {activeAdsCount != null && (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                                        background: '#f0f9ff', color: '#0369a1',
                                        fontSize: '11px', fontWeight: '600',
                                        borderRadius: '8px', padding: '2px 7px',
                                        border: '1px solid #bae6fd'
                                    }}>
                                        {activeAdsCount} ads
                                    </span>
                                )}
                            </div>
                        )}
                        {beneficiary && <p className={styles.beneficiary}>{beneficiary}</p>}

                        {/* Tag Button Segment */}
                        <div style={{ marginTop: '6px' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsTagModalOpen(true); }}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '4px 8px',
                                    fontSize: '11px', fontWeight: '500', background: tagName ? '#e0f2fe' : 'transparent',
                                    color: tagName ? '#0369a1' : '#64748b', cursor: 'pointer',
                                    borderColor: tagName ? '#bae6fd' : '#cbd5e1',
                                }}
                            >
                                <TagIcon size={12} />
                                {tagName || '+ Tag'}
                            </button>
                        </div>
                    </div>
                    <div className={styles.buttonGroup}>
                        {currentTab !== 'unprocessed' && (
                            <button
                                className={`${styles.actionBtn} ${styles.pendingBtn}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange?.(pageId, 'unprocessed');
                                }}
                                title="Revert to Pending"
                            >
                                <RotateCcw size={18} />
                            </button>
                        )}
                        {currentTab !== 'deleted' && (
                            <button
                                className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange?.(pageId, 'deleted');
                                }}
                                title="Mark as Deleted"
                            >
                                <X size={18} />
                            </button>
                        )}
                        {currentTab !== 'saved' && (
                            <button
                                className={`${styles.actionBtn} ${styles.approveBtn}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange?.(pageId, 'saved');
                                }}
                                title="Mark as Saved"
                            >
                                <Check size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.mediaContainer}>
                {mediaUrl ? (
                    mediaType === 'video' ? (
                        <video src={mediaUrl} controls autoPlay loop muted playsInline className={styles.media} />
                    ) : (
                        <img src={mediaUrl} alt={pageName} className={styles.media} referrerPolicy="no-referrer" />
                    )
                ) : (
                    <div className={styles.placeholder}>No Media</div>
                )}
            </div>

            <TagSelector
                isOpen={isTagModalOpen}
                onClose={() => setIsTagModalOpen(false)}
                currentTagId={tagId}
                currentTagName={tagName}
                pageId={pageId}
                onTagUpdate={(newTagId, newTagName) => {
                    if (onTagUpdate) onTagUpdate(pageId, newTagId, newTagName);
                }}
            />

            {isExplainModalOpen && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'default'
                    }}
                    onClick={(e) => { e.stopPropagation(); setIsExplainModalOpen(false); }}
                >
                    <div
                        style={{
                            background: 'white', padding: '24px', borderRadius: '12px',
                            width: '400px', maxWidth: '90%', position: 'relative',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsExplainModalOpen(false); }}
                            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                        >
                            <X size={20} />
                        </button>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <Brain size={24} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', display: 'block', marginBottom: '4px' }}>What does this company do:</span>
                                {pageName}
                            </div>
                        </h3>
                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            {isExplanationLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', justifyContent: 'center', padding: '12px 0' }}>
                                    <Loader2 size={20} style={{ animation: 'spin 1.5s linear infinite' }} />
                                    <span>Asking ChatGPT...</span>
                                    <style>{`
                                        @keyframes spin { 100% { transform: rotate(360deg); } }
                                    `}</style>
                                </div>
                            ) : explanationError ? (
                                <div style={{ color: '#ef4444', textAlign: 'center', padding: '12px 0' }}>{explanationError}</div>
                            ) : (
                                <p style={{ margin: 0, color: '#334155', lineHeight: '1.6', fontSize: '15px' }}>{explanationText}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
