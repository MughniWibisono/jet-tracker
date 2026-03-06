import React, { useState } from 'react';
import { LayoutDashboard, ArrowLeft, Plus, Save, Trash2, Box } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AddContainer() {
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        destination: 'Melbourne',
        nusaRef: '',
        jetRef: '',
    });
    const [containers, setContainers] = useState(['']);

    const destinations = ["Melbourne", "Brisbane", "Sydney", "Fremantle", "Adelaide"];

    const handleContainerChange = (index, value) => {
        const newContainers = [...containers];
        newContainers[index] = value;
        setContainers(newContainers);
    };

    const handleAddContainerRow = () => {
        setContainers([...containers, '']);
    };

    const handleRemoveContainerRow = (index) => {
        if (containers.length > 1) {
            const newContainers = containers.filter((_, i) => i !== index);
            setContainers(newContainers);
        }
    };

    const handleSave = async () => {
        if (!formData.nusaRef || !formData.jetRef || !containers[0]) {
            alert("Please enter Nusa Ref, Jet Ref, and at least one Container number.");
            return;
        }

        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const collRef = collection(db, 'shipments');

            // Create a document for each container
            containers.forEach(containerNo => {
                if (containerNo.trim()) {
                    const newDocRef = doc(collRef);
                    batch.set(newDocRef, {
                        destination: formData.destination,
                        nusaRef: formData.nusaRef,
                        jetRef: formData.jetRef,
                        containerNo: containerNo.trim(),
                        // Set ETA and Available Date to default based on destination, or leave empty for grid
                        eta: '',
                        availableDate: '',
                        priority: false,
                        deliveryDate: '',
                        time: '',
                        confirm: false,
                        remarks: '',
                        jetComment: '',
                        clearCustoms: false,
                        deliveryOrder: false
                    });
                }
            });

            await batch.commit();
            navigate('/');
        } catch (err) {
            console.error(err);
            alert("Failed to save containers to Firebase. Are rules set up correctly?");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="app-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header className="glass-panel app-header" style={{ padding: '16px 24px', marginBottom: '8px' }}>
                <div className="header-title-container">
                    <Box className="text-primary-accent" size={24} color="var(--primary-accent)" />
                    <div>
                        <h1 className="header-title" style={{ fontSize: '1.25rem' }}>Add Container</h1>
                        <span className="header-subtitle">New Jet Shipment</span>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={() => navigate('/')}>
                        <ArrowLeft size={16} /> Back to Grid
                    </button>
                </div>
            </header>

            <main className="glass-panel" style={{ padding: '32px' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Top Form Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Destination</label>
                            <select
                                value={formData.destination}
                                onChange={e => setFormData({ ...formData, destination: e.target.value })}
                                style={{
                                    padding: '12px', borderRadius: '8px',
                                    background: 'var(--panel-bg)', color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)', outline: 'none'
                                }}
                            >
                                {destinations.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Nusa Ref Number</label>
                            <input
                                type="text"
                                value={formData.nusaRef}
                                onChange={e => setFormData({ ...formData, nusaRef: e.target.value })}
                                placeholder="e.g. S00010600"
                                style={{
                                    padding: '12px', borderRadius: '8px',
                                    background: 'var(--panel-bg)', color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)', outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Jet Ref Number</label>
                            <input
                                type="text"
                                value={formData.jetRef}
                                onChange={e => setFormData({ ...formData, jetRef: e.target.value })}
                                placeholder="e.g. 2026-12931"
                                style={{
                                    padding: '12px', borderRadius: '8px',
                                    background: 'var(--panel-bg)', color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)', outline: 'none'
                                }}
                            />
                        </div>

                    </div>

                    <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0', opacity: 0.5 }} />

                    {/* Containers Section */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Container Numbers</h3>
                            <button className="btn btn-secondary" onClick={handleAddContainerRow} style={{ padding: '6px 12px' }}>
                                <Plus size={14} /> Add Another
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {containers.map((c, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)', width: '24px' }}>{idx + 1}.</span>
                                    <input
                                        type="text"
                                        value={c}
                                        onChange={e => handleContainerChange(idx, e.target.value)}
                                        placeholder={`Container Number ${idx + 1}`}
                                        style={{
                                            flex: 1, padding: '12px', borderRadius: '8px',
                                            background: 'var(--panel-bg)', color: 'var(--text-primary)',
                                            border: '1px solid var(--border-color)', outline: 'none'
                                        }}
                                    />
                                    {containers.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveContainerRow(idx)}
                                            style={{
                                                background: 'transparent', border: '1px solid var(--danger)',
                                                color: 'var(--danger)', borderRadius: '8px',
                                                padding: '10px', cursor: 'pointer', display: 'flex'
                                            }}
                                            title="Remove Container"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                        <button
                            className={`btn btn-primary ${isSaving ? 'loading' : ''}`}
                            onClick={handleSave}
                            disabled={isSaving}
                            style={{ padding: '12px 32px', fontSize: '1rem' }}
                        >
                            <Save size={18} /> {isSaving ? 'Saving...' : 'Save & Continue'}
                        </button>
                    </div>

                </div>
            </main>
        </div>
    );
}
