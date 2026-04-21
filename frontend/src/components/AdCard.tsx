import { X, Check, RotateCcw, Tag as TagIcon, Brain, Loader2, BarChart2, ChevronDown, ChevronUp, Activity, Play, Trash2 } from 'lucide-react';
import styles from './AdCard.module.css';
import { TagSelector } from './TagSelector';
import { useState, useRef, useEffect } from 'react';
import React from 'react';
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
    isQueuedForScrape?: boolean;
}

type AdLink = {
    url: string;
    is_active: boolean;
    reach: number;
    start_time?: string;
    stop_time?: string;
    countries?: string[];
};

type AdGroup = {
    body: string;
    reach: number;
    is_active?: boolean;
    links: AdLink[]
};

type ActivityPoint = {
    week: string;
    active_count: number;
};

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
    currentTab = 'unprocessed',
    isQueuedForScrape = false
}: AdCardProps) {
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
    const [explanationText, setExplanationText] = useState("");
    const [isExplanationLoading, setIsExplanationLoading] = useState(false);
    const [explanationError, setExplanationError] = useState("");

    // Ad Groups state
    const [adGroups, setAdGroups] = useState<AdGroup[] | null>(null);
    const [activityGraph, setActivityGraph] = useState<ActivityPoint[] | null>(null);
    const [totalScrapedReach, setTotalScrapedReach] = useState<number | null>(null);
    const [countryStats, setCountryStats] = useState<Record<string, number> | null>(null);
    const [adGroupsStatus, setAdGroupsStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
    const [isGroupsPanelOpen, setIsGroupsPanelOpen] = useState(false);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isScrapingRequested, setScrapingRequested] = useState(isQueuedForScrape);
    const [isScrapeActionLoading, setIsScrapeActionLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // Notes State
    const [showNotes, setShowNotes] = useState(false);
    const [noteContent, setNoteContent] = useState("");
    const [isNotesLoaded, setIsNotesLoaded] = useState(false);
    const [isNotesLoading, setIsNotesLoading] = useState(false);

    // Observer para carga diferida (Intersection Observer)
    useEffect(() => {
        if (!cardRef.current) return;
        
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect(); // Una vez visible, ya no lo necesitamos
            }
        }, { threshold: 0.1 });

        observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, []);

    // Limpia el interval al desmontar el componente
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    // Al montar (y cuando sea visible), chequea si ya hay grupos analizados en la BD
    useEffect(() => {
        if (!isVisible) return;

        let cancelled = false;
        api.get(`/pages/${pageId}/ad-groups`).then((result) => {
            if (cancelled) return;
            if (result.status === 'done' && result.groups) {
                // Compatibility for old format vs new format
                if (Array.isArray(result.groups)) {
                    setAdGroups(result.groups);
                } else if (result.groups && typeof result.groups === 'object') {
                    setAdGroups(result.groups.groups || []);
                    setActivityGraph(result.groups.activity_graph || null);
                    setTotalScrapedReach(result.groups.total_scraped_reach || null);
                    setCountryStats(result.groups.country_stats || null);
                }
                setAdGroupsStatus('done');
            } else if (result.status === 'processing') {
                // Hay un análisis en curso en el servidor - arrancar polling
                setAdGroupsStatus('loading');
                setIsGroupsPanelOpen(true);
                pollIntervalRef.current = setInterval(async () => {
                    try {
                        const r = await api.get(`/pages/${pageId}/ad-groups`);
                        if (r.status === 'done' && r.groups) {
                            if (Array.isArray(r.groups)) {
                                setAdGroups(r.groups);
                            } else if (r.groups && typeof r.groups === 'object') {
                                setAdGroups(r.groups.groups || []);
                                setActivityGraph(r.groups.activity_graph || null);
                                setTotalScrapedReach(r.groups.total_scraped_reach || null);
                                setCountryStats(r.groups.country_stats || null);
                            }
                            setAdGroupsStatus('done');
                            clearInterval(pollIntervalRef.current!);
                            pollIntervalRef.current = null;
                        }
                    } catch {
                        setAdGroupsStatus('error');
                        clearInterval(pollIntervalRef.current!);
                        pollIntervalRef.current = null;
                    }
                }, 5000);
            }
        }).catch(() => { /* sin grupos previos, no hacer nada */ });
        return () => { cancelled = true; };
    }, [pageId, isVisible]);



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

    const handleAnalyzeClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsGroupsPanelOpen(true);
        if (adGroupsStatus === 'loading' || adGroupsStatus === 'done') return; // Ya en proceso o ya finalizado

        setAdGroupsStatus('loading');
        try {
            await api.post(`/pages/${pageId}/analyze-groups`, {});
        } catch {
            // El POST puede fallar si ya hay un análisis corriendo, ignoramos
        }

        // Limpiar cualquier interval anterior antes de arrancar uno nuevo
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        // Polling hasta recibir datos
        pollIntervalRef.current = setInterval(async () => {
            try {
                const result = await api.get(`/pages/${pageId}/ad-groups`);
                if (result.status === 'done' && result.groups) {
                    if (Array.isArray(result.groups)) {
                        setAdGroups(result.groups);
                    } else if (result.groups && typeof result.groups === 'object') {
                        setAdGroups(result.groups.groups || []);
                        setActivityGraph(result.groups.activity_graph || null);
                        setTotalScrapedReach(result.groups.total_scraped_reach || null);
                        setCountryStats(result.groups.country_stats || null);
                    }
                    setAdGroupsStatus('done');
                    clearInterval(pollIntervalRef.current!);
                    pollIntervalRef.current = null;
                }
            } catch {
                setAdGroupsStatus('error');
                clearInterval(pollIntervalRef.current!);
                pollIntervalRef.current = null;
            }
        }, 5000);
    };

    const handleFullScrapeClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isScrapingRequested || isScrapeActionLoading) return;
        
        setIsScrapeActionLoading(true);
        try {
            await api.post(`/pages/${pageId}/trigger-full-scrape`, {});
            setScrapingRequested(true);
        } catch (err: any) {
            alert("Failed to trigger full scrape: " + (err.message || "Unknown error"));
        } finally {
            setIsScrapeActionLoading(false);
        }
    };

    const handleCancelScrapeClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isScrapeActionLoading) return;

        setIsScrapeActionLoading(true);
        try {
            await api.post(`/pages/${pageId}/cancel-full-scrape`, {});
            setScrapingRequested(false);
        } catch (err: any) {
            alert("Failed to cancel scrape: " + (err.message || "Unknown error"));
        } finally {
            setIsScrapeActionLoading(false);
        }
    };

    const handleClearAnalysis = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete the analysis for this page?")) return;

        try {
            await api.delete(`/api/pages/${pageId}/ad-groups`);
            setAdGroups(null);
            setActivityGraph(null);
            setTotalScrapedReach(null);
            setCountryStats(null);
            setAdGroupsStatus('idle');
            setIsGroupsPanelOpen(false);
        } catch (err: any) {
            alert("Failed to clear analysis: " + (err.message || "Unknown error"));
        }
    };

    const handleToggleNotes = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const willShow = !showNotes;
        setShowNotes(willShow);

        if (willShow && !isNotesLoaded && !isNotesLoading) {
            setIsNotesLoading(true);
            try {
                const res = await api.get(`/pages/${pageId}/notes`);
                if (res.notes) {
                    setNoteContent(res.notes);
                }
                setIsNotesLoaded(true);
            } catch (err) {
                console.error("Failed to load notes", err);
            } finally {
                setIsNotesLoading(false);
            }
        }
    };

    const handleNoteBlur = async () => {
        if (!isNotesLoaded) return;
        try {
            await api.patch(`/pages/${pageId}/notes`, { notes: noteContent });
        } catch (err) {
            console.error("Failed to save notes", err);
            alert("Failed to save note. Please try again.");
        }
    };

    // Render simple bar graph
    const renderActivityGraph = () => {
        if (!activityGraph || activityGraph.length === 0) return null;

        const maxCount = Math.max(...activityGraph.map(g => g.active_count), 1);

        return (
            <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#475569', fontSize: '12px', fontWeight: '600' }}>
                    <Activity size={14} />
                    Ads Created Over Time
                </div>
                {/* Contenedor del scroll horizontal */}
                <div className="custom-scrollbar" style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '4px',
                    height: '70px', /* Aumentado un poco para el scrollbar */
                    marginTop: '10px',
                    overflowX: 'auto',
                    paddingBottom: '8px'
                }}>
                    {activityGraph.map((point, idx) => {
                        const heightPercent = (point.active_count / maxCount) * 100;
                        return (
                            <div
                                key={idx}
                                title={`${point.week}: ${point.active_count} ads`}
                                style={{
                                    flex: '0 0 auto', /* Evita que las barras se encojan */
                                    background: '#cbd5e1',
                                    minWidth: '12px',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-end',
                                    borderRadius: '2px 2px 0 0',
                                }}
                            >
                                <div style={{
                                    height: `${heightPercent}%`,
                                    background: '#3b82f6',
                                    width: '100%',
                                    borderRadius: '2px 2px 0 0',
                                    transition: 'height 0.3s ease'
                                }}></div>
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#94a3b8' }}>
                    <span>{activityGraph[0].week.replace('-W', ' W')}</span>
                    <span>{activityGraph[activityGraph.length - 1].week.replace('-W', ' W')}</span>
                </div>
            </div>
        );
    };

    const renderCountryStats = () => {
        if (!countryStats || Object.keys(countryStats).length === 0) return null;


        return (
            <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af', fontSize: '12px', fontWeight: '700' }}>
                        <BarChart2 size={14} color="#3b82f6" />
                        Targeted Countries (Ads Count)
                    </div>
                    <button 
                        onClick={handleClearAnalysis}
                        title="Clear analysis data"
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Object.entries(countryStats).map(([country, count]) => (
                        <span key={country} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: '#ebf5ff', color: '#1e40af',
                            fontSize: '11px', fontWeight: '700',
                            borderRadius: '12px', padding: '3px 10px',
                            border: '1px solid #bfdbfe',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }} title={`${count} ads target ${country}`}>
                            {country}: {count}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div ref={cardRef} className={styles.card} onClick={handleCardClick} style={{ cursor: snapshotUrl ? 'pointer' : 'default' }}>
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
                        {/* New Scraped Reach Badge */}
                        {totalScrapedReach != null && (
                            <div style={{ marginTop: '6px' }}>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    background: '#fef08a', color: '#854d0e',
                                    fontSize: '11px', fontWeight: '600',
                                    borderRadius: '8px', padding: '2px 8px',
                                    border: '1px solid #fde047'
                                }} title="Total reach downloaded by full scrape">
                                    Scraped Reach: {new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(totalScrapedReach)}
                                </span>
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

            {/* Buttons Row */}
            <div style={{ padding: '8px 12px 4px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                {/* Analyze / View Ads Button */}
                {adGroupsStatus === 'done' ? (
                    // Ya analizado: botón para mostrar/ocultar la tabla
                    <button
                        onClick={e => { e.stopPropagation(); setIsGroupsPanelOpen(v => !v); }}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            fontSize: '12px', fontWeight: '600', padding: '5px 12px',
                            borderRadius: '8px', border: '1px solid #bbf7d0',
                            background: '#f0fdf4', color: '#15803d',
                            cursor: 'pointer', flex: 1, justifyContent: 'center'
                        }}
                    >
                        <BarChart2 size={14} />
                        {isGroupsPanelOpen ? 'Hide Ad Groups' : 'View Ad Groups'}
                    </button>
                ) : (
                    // No analizado aún: botón para iniciar el análisis
                    <button
                        onClick={handleAnalyzeClick}
                        disabled={adGroupsStatus === 'loading'}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            fontSize: '12px', fontWeight: '600', padding: '5px 12px',
                            borderRadius: '8px', border: '1px solid #93c5fd',
                            background: '#eff6ff', color: '#1d4ed8',
                            cursor: adGroupsStatus === 'loading' ? 'not-allowed' : 'pointer',
                            opacity: adGroupsStatus === 'loading' ? 0.6 : 1,
                            flex: 1, justifyContent: 'center'
                        }}
                    >
                        {adGroupsStatus === 'loading'
                            ? <><Loader2 size={14} style={{ animation: 'spin 1.5s linear infinite' }} /> Analyzing...<style>{`@keyframes spin{100%{transform:rotate(360deg)}}`}</style></>
                            : <><BarChart2 size={14} /> Analyze Ad Groups</>}
                    </button>
                )}

                {/* Full Scrape Action Button */}
                {!isScrapingRequested ? (
                    <button
                        onClick={handleFullScrapeClick}
                        disabled={isScrapeActionLoading}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            fontSize: '12px', fontWeight: '600', padding: '5px 12px',
                            borderRadius: '8px', border: '1px solid #fcd34d',
                            background: '#fef3c7', color: '#b45309',
                            cursor: isScrapeActionLoading ? 'not-allowed' : 'pointer', 
                            flex: 1, justifyContent: 'center',
                            opacity: isScrapeActionLoading ? 0.7 : 1
                        }}
                        title="Send to C# Master (Mode 10) for Product extraction and Video download"
                    >
                        {isScrapeActionLoading ? (
                            <Loader2 size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
                        ) : (
                            <Play size={14} />
                        )}
                        Run Full Scrape
                    </button>
                ) : (
                    <div
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            fontSize: '12px', fontWeight: '600', padding: '5px 6px 5px 12px',
                            borderRadius: '8px', border: '1px solid #e2e8f0',
                            background: '#f8fafc', color: '#94a3b8',
                            flex: 1, justifyContent: 'space-between', cursor: 'default',
                            opacity: isScrapeActionLoading ? 0.7 : 1
                        }}
                    >
                        <span>Queued for Master</span>
                        <button
                            onClick={handleCancelScrapeClick}
                            disabled={isScrapeActionLoading}
                            title="Cancel and remove from queue"
                            style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: '20px', height: '20px', flexShrink: 0,
                                borderRadius: '4px', border: '1px solid #fca5a5',
                                background: '#fef2f2', color: '#dc2626',
                                cursor: isScrapeActionLoading ? 'not-allowed' : 'pointer', 
                                fontSize: '11px', fontWeight: '700',
                                padding: 0, lineHeight: 1
                            }}
                        >
                            {isScrapeActionLoading ? (
                                <Loader2 size={10} style={{ animation: 'spin 1.5s linear infinite' }} />
                            ) : (
                                '✕'
                            )}
                        </button>
                    </div>
                )}
                
                {/* Notes Toggle Button */}
                <button
                    onClick={handleToggleNotes}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '12px', fontWeight: '600', padding: '5px 12px',
                        borderRadius: '8px', border: '1px solid #d1d5db',
                        background: showNotes ? '#e5e7eb' : '#ffffff', color: '#4b5563',
                        cursor: 'pointer', flex: 0.8, justifyContent: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    title="View and edit notes for this page"
                >
                    📝 {showNotes ? 'Hide Notes' : 'Notes'}
                </button>
            </div>

            {/* Notes Panel */}
            {showNotes && (
                <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }} onClick={e => e.stopPropagation()}>
                    {isNotesLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                            <Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
                            Loading notes...
                        </div>
                    ) : (
                        <textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            onBlur={handleNoteBlur}
                            placeholder="Add notes for this page here... (Saves automatically when you click outside)"
                            style={{
                                width: '100%',
                                minHeight: '80px',
                                padding: '10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                color: '#334155',
                                resize: 'vertical',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit',
                                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        />
                    )}
                </div>
            )}

            {/* Groups Panel */}
            {isGroupsPanelOpen && (
                <div style={{ borderTop: '1px solid #e2e8f0' }} onClick={e => e.stopPropagation()}>
                    {adGroupsStatus === 'loading' && (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                            Fetching ads from Meta... this may take a minute.
                        </div>
                    )}
                    {adGroupsStatus === 'error' && (
                        <div style={{ padding: '12px', color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>Error fetching groups.</div>
                    )}
                    {adGroupsStatus === 'done' && adGroups && (
                        <div>
                            {renderActivityGraph()}
                            {renderCountryStats()}
                            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Reach</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Links</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {adGroups.map((group, i) => {
                                            const isActive = group.is_active;
                                            return (
                                                <React.Fragment key={i}>
                                                    <tr
                                                        onClick={() => setExpandedGroup(expandedGroup === i ? null : i)}
                                                        style={{
                                                            borderBottom: '1px solid #f1f5f9',
                                                            cursor: 'pointer',
                                                            background: expandedGroup === i ? '#f0f9ff' : (isActive ? '#f0fdf4' : 'white')
                                                        }}
                                                    >
                                                        <td style={{ padding: '8px 12px', fontWeight: '600', color: isActive ? '#15803d' : '#0f172a' }}>
                                                            {isActive && <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', marginRight: '6px' }}></span>}
                                                            {new Intl.NumberFormat('en-US').format(group.reach)}
                                                        </td>
                                                        <td style={{ padding: '8px 12px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {group.links.length} ads
                                                            {expandedGroup === i ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                        </td>
                                                    </tr>
                                                    {expandedGroup === i && (
                                                        <tr key={`links-${i}`}>
                                                            <td colSpan={2} style={{ padding: '0 12px 8px 24px', background: '#f8fafc' }}>
                                                                <ul style={{ margin: 0, padding: '8px 0', listStyle: 'none' }}>
                                                                    {group.links.map((linkObj, j) => {
                                                                        // Compatibilidad: si el link es viejo viene como string, si es nuevo como objeto
                                                                        let linkUrl = '';
                                                                        let isAdActive = false;
                                                                        let adReach = 0;

                                                                        if (typeof linkObj === 'string') {
                                                                            linkUrl = linkObj;
                                                                        } else {
                                                                            linkUrl = linkObj.url;
                                                                            isAdActive = linkObj.is_active;
                                                                            adReach = linkObj.reach;
                                                                        }

                                                                        return (
                                                                            <li key={j} style={{ marginBottom: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                                                                {isAdActive ? (
                                                                                    <span style={{ color: '#15803d', fontWeight: 'bold' }}>🟢 Live</span>
                                                                                ) : (
                                                                                    <span style={{ color: '#94a3b8' }}>⚪ Inactive</span>
                                                                                )}
                                                                                <span style={{ color: '#475569', fontWeight: 600 }}>
                                                                                    | Reach: {new Intl.NumberFormat('en-US', { notation: "compact" }).format(adReach)}
                                                                                </span>
                                                                                | <a
                                                                                    href={linkUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    style={{ color: '#6366f1', wordBreak: 'break-all' }}
                                                                                >
                                                                                    Ad #{j + 1} URL
                                                                                </a>
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

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
