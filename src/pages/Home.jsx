import React, { useState, useEffect } from 'react';
import '../index.css';
import { LayoutDashboard, Plus, Save, Cloud, CloudOff, RefreshCw, FileText, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataGrid from '../components/DataGrid';
import { useFirebaseData } from '../hooks/useFirebaseData';

function Home() {
    const { serverData, saveBatch, loading, error } = useFirebaseData('shipments');
    const [localData, setLocalData] = useState([]);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('Melbourne');

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'jetRef', direction: 'asc' });

    // Checkbox Filters
    const [filters, setFilters] = useState({
        priority: false,
        confirm: false,
        clearCustoms: false,
        deliveryOrder: false
    });

    // Search Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [isDeleteMode, setIsDeleteMode] = useState(false);

    const navigate = useNavigate();

    const DESTINATIONS = ["Melbourne", "Sydney", "Brisbane", "Fremantle", "Adelaide"];

    // Sync with server data on initial load
    useEffect(() => {
        if (!isDirty) {
            const normalizedData = serverData.map(item => {
                if (item.destination) return item;

                let dest = 'Unknown';
                if (item.remarks && item.remarks.includes('Destination: ')) {
                    dest = item.remarks.split('Destination: ')[1].split(' ')[0].trim();
                }

                return { ...item, destination: dest };
            });

            // Sort by nusaRef and jetRef so grouping works properly
            normalizedData.sort((a, b) => {
                const nusaA = a.nusaRef || '';
                const nusaB = b.nusaRef || '';
                if (nusaA < nusaB) return -1;
                if (nusaA > nusaB) return 1;

                const jetA = a.jetRef || '';
                const jetB = b.jetRef || '';
                if (jetA < jetB) return -1;
                if (jetA > jetB) return 1;

                return 0;
            });

            setLocalData(normalizedData);
        }
    }, [serverData, isDirty]);

    // Warn user if they try to close the page with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave without saving?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);

    const handleRowChange = (updatedRow) => {
        const newData = [...localData];
        const index = newData.findIndex(r => r.id === updatedRow.id);
        if (index !== -1) {
            newData[index] = updatedRow;
            setLocalData(newData);
            setIsDirty(true);
        }
    };

    const handleDeleteRow = (id) => {
        setLocalData(prev => prev.filter(r => r.id !== id));
        setIsDirty(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveBatch(localData);
            setIsDirty(false);
        } catch (err) {
            alert("Error saving data. Check console.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRevert = () => {
        setLocalData(serverData);
        setIsDirty(false);
    };

    const getDestinationFromItem = (item) => {
        return item.destination || 'Unknown';
    };

    const filteredData = localData.filter(item => {
        // Tab destination filter
        if (getDestinationFromItem(item) !== activeTab) return false;

        // Boolean Checkbox Filters
        if (filters.priority && !item.priority) return false;
        if (filters.confirm && !item.confirm) return false;
        if (filters.clearCustoms && !item.clearCustoms) return false;
        if (filters.deliveryOrder && !item.deliveryOrder) return false;

        // Search Text Filter (Jet Ref or Container No)
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase().trim();
            const jetMatch = item.jetRef && typeof item.jetRef === 'string' && item.jetRef.toLowerCase().includes(query);
            const containerMatch = item.containerNo && typeof item.containerNo === 'string' && item.containerNo.toLowerCase().includes(query);
            if (!jetMatch && !containerMatch) return false;
        }

        return true;
    });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedData = [...filteredData].sort((a, b) => {
        const key = sortConfig.key;
        let valA = a[key] || '';
        let valB = b[key] || '';

        // Always push empty/blank values to the bottom regardless of sort direction
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;

        // Ensure string comparison
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const todayDate = new Date();
    const formattedDateString = todayDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Summary Statistics Logic
    const todayParams = new Date();
    todayParams.setHours(0, 0, 0, 0);
    const next7Days = new Date(todayParams);
    next7Days.setDate(todayParams.getDate() + 7);

    const arrivingNext7Days = localData.filter(item => {
        if (getDestinationFromItem(item) !== activeTab) return false;
        if (!item.eta) return false;

        // Handle incoming raw date data from HTML5 (e.g., "2026-03-08")
        const parts = item.eta.split('-');
        if (parts.length !== 3) return false;

        const yr = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const day = parseInt(parts[2], 10);

        // Ensure etaDate is strictly set to midnight local time for fair comparison
        const etaDate = new Date(yr, month, day, 0, 0, 0, 0);

        return etaDate >= todayParams && etaDate <= next7Days;
    }).length;

    const awaitingCustomClearance = localData.filter(item =>
        getDestinationFromItem(item) === activeTab && item.containerNo && item.containerNo.trim() !== '' && !item.clearCustoms
    ).length;

    const pendingDeliveryOrder = localData.filter(item =>
        getDestinationFromItem(item) === activeTab && item.containerNo && item.containerNo.trim() !== '' && !item.deliveryOrder
    ).length;

    const totalCityContainers = localData.filter(item => getDestinationFromItem(item) === activeTab).length;

    const formatStat = (qty) => {
        if (qty === 0) return ": -";
        return `: ${qty} Container${qty === 1 ? '' : 's'}`;
    };

    return (
        <div className="app-container">
            {isDeleteMode && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    boxShadow: 'inset 0 0 50px rgba(239, 68, 68, 0.4)',
                    border: '4px solid rgba(239, 68, 68, 0.6)',
                    pointerEvents: 'none',
                    zIndex: 9999,
                    animation: 'pulseAura 2s infinite'
                }} />
            )}
            <header className="glass-panel app-header" style={{ alignItems: 'flex-start', paddingBottom: '16px' }}>
                <div className="header-title-container" style={{ marginTop: '12px' }}>
                    <LayoutDashboard className="text-primary-accent" size={28} color="var(--primary-accent)" />
                    <div>
                        <h1 className="header-title">Jet Technologies - {totalCityContainers} Container{totalCityContainers !== 1 ? 's' : ''}</h1>
                        <span className="header-subtitle">Weekly report - {formattedDateString} {isDirty && <span style={{ color: 'var(--primary-accent)', marginLeft: '4px', fontSize: '1.2em' }}>*</span>}</span>
                    </div>
                </div>
                <div className="header-actions">
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch' }}>
                        <div
                            className="glass-panel"
                            style={{
                                backgroundColor: '#FFFFCC', /* Keeps the yellow colour */
                                padding: '16px 24px',
                                display: 'grid',
                                gridTemplateColumns: 'auto auto',
                                gap: '8px 24px',
                                color: 'var(--text-primary)',
                                fontWeight: '600',
                                fontSize: '0.875rem',
                                alignItems: 'center',
                                width: '400px'
                            }}
                        >
                            <div>Arriving next 7 Days</div>
                            <div>{formatStat(arrivingNext7Days)}</div>
                            <div>Awaiting Custom Clearance</div>
                            <div>{formatStat(awaitingCustomClearance)}</div>
                            <div>Pending Delivery Order</div>
                            <div>{formatStat(pendingDeliveryOrder)}</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', minWidth: '180px' }}>
                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                <button className="btn btn-secondary" onClick={() => navigate('/add')} style={{ flex: 1, justifyContent: 'center' }}>
                                    <Plus size={16} /> Add
                                </button>
                                <button className="btn btn-secondary" onClick={() => navigate('/import')} style={{ flex: 1, justifyContent: 'center' }}>
                                    <FileText size={16} /> Import
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                {isDirty && (
                                    <button className="btn btn-secondary" onClick={handleRevert} title="Revert to saved data" style={{ flex: 1, padding: '10px 8px' }}>
                                        <RefreshCw size={16} />
                                    </button>
                                )}
                                <button
                                    className={`btn btn-primary ${isSaving ? 'loading' : ''}`}
                                    onClick={handleSave}
                                    disabled={!isDirty || isSaving}
                                    style={{ opacity: (!isDirty || isSaving) ? 0.5 : 1, flex: 2, justifyContent: 'center' }}
                                >
                                    <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="glass-panel main-content">

                <div className="tabs-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                    <div style={{ display: 'flex' }}>
                        {DESTINATIONS.map(dest => (
                            <button
                                key={dest}
                                className={`tab ${activeTab === dest ? 'active' : ''}`}
                                onClick={() => setActiveTab(dest)}
                            >
                                {dest}
                            </button>
                        ))}
                    </div>
                    <div>
                        {error ? (
                            <div className="btn" style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', cursor: 'default', padding: '6px 12px' }}>
                                <CloudOff size={16} /> Disconnected
                            </div>
                        ) : (
                            <div className="btn" style={{ color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)', cursor: 'default', padding: '6px 12px' }}>
                                <Cloud size={16} /> Connected
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '24px', padding: '0 24px 16px 24px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {Object.keys(filters).map(filterKey => {
                            const labels = {
                                priority: 'Priority',
                                confirm: 'Confirmed',
                                clearCustoms: 'Clear Customs',
                                deliveryOrder: 'Delivery Order'
                            };
                            return (
                                <label key={filterKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    <input
                                        type="checkbox"
                                        className="custom-checkbox"
                                        checked={filters[filterKey]}
                                        onChange={(e) => setFilters(prev => ({ ...prev, [filterKey]: e.target.checked }))}
                                        style={{ margin: 0 }}
                                    />
                                    {labels[filterKey]}
                                </label>
                            );
                        })}
                    </div>

                    <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-color)' }}></div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, marginRight: '8px' }}>Sort by:</span>
                        {[
                            { key: 'jetRef', label: 'Jet Ref.' },
                            { key: 'eta', label: 'ETA' },
                            { key: 'deliveryDate', label: 'Delivery Date' }
                        ].map(sortOption => (
                            <button
                                key={sortOption.key}
                                onClick={() => handleSort(sortOption.key)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: sortConfig.key === sortOption.key ? 'var(--primary-accent)' : 'white',
                                    color: sortConfig.key === sortOption.key ? 'white' : 'var(--text-secondary)',
                                    border: `1px solid ${sortConfig.key === sortOption.key ? 'var(--primary-accent)' : 'var(--border-color)'}`,
                                    padding: '4px 12px',
                                    borderRadius: '16px',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: 'var(--shadow)',
                                    fontWeight: sortConfig.key === sortOption.key ? 600 : 400
                                }}
                            >
                                {sortOption.label}
                                {sortConfig.key === sortOption.key && (
                                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-color)', margin: '0 8px' }}></div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Search:</span>
                        <input
                            type="text"
                            placeholder="Jet Ref or Container No..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color)',
                                outline: 'none',
                                fontSize: '0.8rem',
                                color: 'var(--text-primary)',
                                minWidth: '220px',
                                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
                            }}
                        />
                        
                        <div style={{ marginLeft: 'auto' }}>
                            <button
                                onClick={() => setIsDeleteMode(!isDeleteMode)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: !isDeleteMode ? '#ef4444' : '#fee2e2',
                                    color: !isDeleteMode ? 'white' : '#ef4444',
                                    border: `1px solid ${!isDeleteMode ? '#ef4444' : '#fca5a5'}`,
                                    padding: '6px 12px',
                                    borderRadius: '16px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: 'var(--shadow)',
                                    fontWeight: isDeleteMode ? 600 : 400
                                }}
                            >
                                <Trash2 size={14} /> Delete Mode
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={24} className="animate-spin" />
                        <span style={{ marginLeft: '12px' }}>Loading data...</span>
                    </div>
                ) : (
                    <DataGrid
                        data={sortedData}
                        onRowChange={handleRowChange}
                        isDeleteMode={isDeleteMode}
                        onRowDelete={handleDeleteRow}
                    />
                )}
            </main>
        </div>
    );
}

export default Home;
