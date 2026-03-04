import { X, Check, RotateCcw, Tag as TagIcon } from 'lucide-react';
import styles from './AdCard.module.css';
import { TagSelector } from './TagSelector';
import { useState } from 'react';

interface AdCardProps {
    pageId: string;
    pageName: string;
    beneficiary?: string;
    totalReach: number;
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
    const formattedReach = new Intl.NumberFormat('en-US', {
        notation: "compact",
        compactDisplay: "short"
    }).format(totalReach);

    const handleCardClick = () => {
        if (snapshotUrl) {
            window.open(snapshotUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className={styles.card} onClick={handleCardClick} style={{ cursor: snapshotUrl ? 'pointer' : 'default' }}>
            {/* Header info */}
            <div className={styles.header}>
                <div className={styles.titleRow}>
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
                </div>
                <div className={styles.actionRow} style={{ marginTop: '8px' }}>
                    <div className={styles.infoCol}>
                        <span className={styles.reach}>{formattedReach}</span>
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
        </div>
    );
}
