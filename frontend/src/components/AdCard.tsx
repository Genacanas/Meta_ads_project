import { Check, X } from 'lucide-react';
import styles from './AdCard.module.css';

interface AdCardProps {
    pageId: string;
    pageName: string;
    beneficiary?: string; // New Prop
    totalReach: number;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    snapshotUrl?: string;
    onStatusChange?: (pageId: string, status: 'saved' | 'deleted') => void;
}

export function AdCard({
    pageId,
    pageName,
    beneficiary = 'Unknown',
    totalReach,
    mediaUrl,
    mediaType = 'image',
    snapshotUrl,
    onStatusChange,
}: AdCardProps) {
    // Format reach with spaces (e.g. 882 329 833)
    const formattedReach = new Intl.NumberFormat('fr-FR').format(totalReach).replace(/,/g, ' ');

    const handleCardClick = () => {
        if (snapshotUrl) {
            window.open(snapshotUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className={styles.card} onClick={handleCardClick} style={{ cursor: snapshotUrl ? 'pointer' : 'default' }}>
            <div className={styles.header}>
                <div className={styles.titleRow}>
                    <h3 className={styles.pageName}>
                        <a
                            href={`https://www.facebook.com/${pageId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'inherit', textDecoration: 'none' }}
                            onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
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
