
import styles from './AdCard.module.css';

interface AdCardProps {
    pageName: string;
    beneficiary?: string; // New Prop
    totalReach: number;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    snapshotUrl?: string;
}

export function AdCard({
    pageName,
    beneficiary = 'Unknown',
    totalReach,
    mediaUrl,
    mediaType = 'image',
    snapshotUrl,
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
                    <h3 className={styles.pageName}>{pageName}</h3>
                    <span className={styles.reach}>{formattedReach}</span>
                </div>
                <p className={styles.beneficiary}>{beneficiary}</p>
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
