import { X, Check, RotateCcw } from 'lucide-react';
import styles from './AdCard.module.css';

interface AdCardProps {
    pageId: string;
    pageName: string;
    beneficiary?: string;
    totalReach: number;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    snapshotUrl?: string;
    onStatusChange?: (pageId: string, status: 'saved' | 'deleted' | 'unprocessed') => void;
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
    onStatusChange,
    currentTab = 'unprocessed'
}: AdCardProps) {
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
                            href={`https://www.facebook.com/${pageId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={styles.pageLink}
                        >
                            {pageName}
                        </a>
                    </h3>
                </div>
                <div className={styles.actionRow}>
                    <div className={styles.infoCol}>
                        <span className={styles.reach}>{formattedReach}</span>
                        <p className={styles.beneficiary}>{beneficiary}</p>
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
        </div>
    );
}
