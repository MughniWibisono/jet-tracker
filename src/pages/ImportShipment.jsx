import React, { useState } from 'react';
import { FileText, ArrowLeft, Search, Upload, CheckCircle, AlertTriangle, Package, Anchor, MapPin, ClipboardPaste, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { parseCartageAdvice } from '../utils/parseCartageAdvice';

export default function ImportShipment() {
    const navigate = useNavigate();
    const [rawText, setRawText] = useState('');
    const [parsedData, setParsedData] = useState(null);
    const [parseError, setParseError] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [duplicates, setDuplicates] = useState([]);
    const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const handleParse = async () => {
        setIsParsing(true);
        setParseError(null);
        setParsedData(null);
        setDuplicates([]);
        setImportResult(null);

        // Small delay so the UI can show "Parsing..."
        await new Promise(r => setTimeout(r, 100));

        const result = parseCartageAdvice(rawText);

        if (!result.success) {
            setParseError(result.error);
            setParsedData(result.data);
            setIsParsing(false);
            return;
        }

        setParsedData(result.data);
        setIsParsing(false);

        // Check duplicates
        if (result.data.containers && result.data.containers.length > 0) {
            setIsCheckingDuplicates(true);
            try {
                const containerNos = result.data.containers.map(c => c.containerNo);
                const collRef = collection(db, 'shipments');
                const snapshot = await getDocs(collRef);
                const existingContainers = [];
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    if (containerNos.includes(data.containerNo)) {
                        existingContainers.push(data.containerNo);
                    }
                });
                setDuplicates(existingContainers);
            } catch (err) {
                console.error('Error checking duplicates:', err);
            } finally {
                setIsCheckingDuplicates(false);
            }
        }
    };

    const handleImport = async () => {
        if (!parsedData || !parsedData.containers || parsedData.containers.length === 0) return;

        const newContainers = parsedData.containers.filter(c => !duplicates.includes(c.containerNo));
        if (newContainers.length === 0) {
            setImportResult({ type: 'warning', message: 'All containers already exist. Nothing to import.' });
            return;
        }

        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const collRef = collection(db, 'shipments');

            newContainers.forEach(container => {
                const newDocRef = doc(collRef);
                const remarks = [
                    parsedData.consignor ? `Consignor: ${parsedData.consignor}` : '',
                    parsedData.goodsDescription ? `Goods: ${parsedData.goodsDescription}` : '',
                    parsedData.deliveryInstructions ? `Delivery: ${parsedData.deliveryInstructions}` : '',
                    parsedData.vessel ? `Vessel: ${parsedData.vessel}${parsedData.voyage ? ' / ' + parsedData.voyage : ''}` : '',
                    parsedData.carrier ? `Carrier: ${parsedData.carrier}` : '',
                ].filter(Boolean).join('\n');

                batch.set(newDocRef, {
                    destination: parsedData.destination || 'Unknown',
                    nusaRef: parsedData.nusaRef || '',
                    jetRef: parsedData.jetRef || '',
                    containerNo: container.containerNo,
                    eta: parsedData.eta || '',
                    availableDate: parsedData.availableDate || '',
                    priority: false,
                    deliveryDate: '',
                    time: '',
                    confirm: false,
                    remarks: remarks,
                    jetComment: '',
                    clearCustoms: false,
                    deliveryOrder: false
                });
            });

            await batch.commit();
            setImportResult({
                type: 'success',
                message: `Successfully imported ${newContainers.length} container${newContainers.length !== 1 ? 's' : ''}!`
            });

            // Redirect after short delay
            setTimeout(() => navigate('/'), 2000);

        } catch (err) {
            console.error('Import error:', err);
            setImportResult({
                type: 'error',
                message: `Failed to import: ${err.message}`
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = () => {
        setRawText('');
        setParsedData(null);
        setParseError(null);
        setDuplicates([]);
        setImportResult(null);
    };

    const newContainerCount = parsedData?.containers
        ? parsedData.containers.filter(c => !duplicates.includes(c.containerNo)).length
        : 0;

    return (
        <div className="app-container" style={{ maxWidth: '960px', margin: '0 auto' }}>
            <header className="glass-panel app-header" style={{ padding: '16px 24px', marginBottom: '8px' }}>
                <div className="header-title-container">
                    <FileText size={24} color="var(--primary-accent)" />
                    <div>
                        <h1 className="header-title" style={{ fontSize: '1.25rem' }}>Import Shipment</h1>
                        <span className="header-subtitle">Paste Cartage Advice Text</span>
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

                    {/* Paste Area */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ClipboardPaste size={16} />
                                Paste Cartage Advice Text Below
                            </label>
                            {rawText && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleClear}
                                    style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                                >
                                    <X size={14} /> Clear
                                </button>
                            )}
                        </div>
                        <textarea
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder="Copy the entire cartage advice document text and paste it here...&#10;&#10;Example:&#10;Sea Freight FCL Arrival Cartage Advice&#10;SHIPMENT S00010691&#10;..."
                            className="import-textarea"
                        />
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <button
                                className={`btn btn-primary ${isParsing ? 'loading' : ''}`}
                                onClick={handleParse}
                                disabled={!rawText.trim() || isParsing}
                                style={{ opacity: (!rawText.trim() || isParsing) ? 0.5 : 1, padding: '12px 32px', fontSize: '1rem' }}
                            >
                                <Search size={18} /> {isParsing ? 'Parsing...' : 'Parse & Check'}
                            </button>
                        </div>
                    </div>

                    {/* Parse Error */}
                    {parseError && (
                        <div className="import-alert import-alert-error">
                            <AlertTriangle size={18} />
                            <span>{parseError}</span>
                        </div>
                    )}

                    {/* Import Result Toast */}
                    {importResult && (
                        <div className={`import-alert ${importResult.type === 'success' ? 'import-alert-success' : importResult.type === 'warning' ? 'import-alert-warning' : 'import-alert-error'}`}>
                            {importResult.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                            <span>{importResult.message}</span>
                        </div>
                    )}

                    {/* Parsed Data Preview */}
                    {parsedData && (
                        <div className="import-preview-section">
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={18} color="var(--success)" />
                                Extracted Shipment Data
                            </h3>

                            {/* Summary Cards */}
                            <div className="import-cards-grid">
                                <div className="import-card">
                                    <span className="import-card-label">Nusa Ref</span>
                                    <span className="import-card-value">{parsedData.nusaRef || '—'}</span>
                                </div>
                                <div className="import-card">
                                    <span className="import-card-label">Jet Ref</span>
                                    <span className="import-card-value">{parsedData.jetRef || '—'}</span>
                                </div>
                                <div className="import-card">
                                    <span className="import-card-label">ETA</span>
                                    <span className="import-card-value">{parsedData.eta || '—'}</span>
                                </div>
                                <div className="import-card">
                                    <span className="import-card-label">Available Date</span>
                                    <span className="import-card-value">{parsedData.availableDate || '—'}</span>
                                </div>
                                <div className="import-card">
                                    <span className="import-card-label">
                                        <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Destination
                                    </span>
                                    <span className="import-card-value">{parsedData.destination || '—'}</span>
                                </div>
                                <div className="import-card">
                                    <span className="import-card-label">
                                        <Anchor size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Vessel
                                    </span>
                                    <span className="import-card-value">{parsedData.vessel ? `${parsedData.vessel} / ${parsedData.voyage || ''}` : '—'}</span>
                                </div>
                                <div className="import-card">
                                    <span className="import-card-label">Carrier</span>
                                    <span className="import-card-value" style={{ fontSize: '0.8rem' }}>{parsedData.carrier || '—'}</span>
                                </div>
                            </div>

                            {/* Additional Info */}
                            {(parsedData.consignor || parsedData.goodsDescription || parsedData.deliveryInstructions) && (
                                <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {parsedData.consignor && <div><strong>Consignor:</strong> {parsedData.consignor}</div>}
                                    {parsedData.goodsDescription && <div style={{ marginTop: '4px' }}><strong>Goods:</strong> {parsedData.goodsDescription}</div>}
                                    {parsedData.deliveryInstructions && <div style={{ marginTop: '4px' }}><strong>Delivery:</strong> {parsedData.deliveryInstructions}</div>}
                                    {parsedData.oceanBOL && <div style={{ marginTop: '4px' }}><strong>Ocean B/L:</strong> {parsedData.oceanBOL}</div>}
                                    {parsedData.packages && <div style={{ marginTop: '4px' }}><strong>Packages:</strong> {parsedData.packages} PKG | <strong>Weight:</strong> {parsedData.weight} KG | <strong>Volume:</strong> {parsedData.volume} M³</div>}
                                </div>
                            )}

                            <hr style={{ borderColor: 'var(--border-color)', margin: '20px 0', opacity: 0.5 }} />

                            {/* Containers Table */}
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Package size={18} color="var(--primary-accent)" />
                                Containers ({parsedData.containers?.length || 0})
                                {isCheckingDuplicates && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Checking duplicates...</span>}
                            </h3>

                            {parsedData.containers && parsedData.containers.length > 0 ? (
                                <div className="import-container-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '50px' }}>#</th>
                                                <th>Container No.</th>
                                                <th>Type</th>
                                                <th style={{ width: '120px' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.containers.map((c, idx) => {
                                                const isDuplicate = duplicates.includes(c.containerNo);
                                                return (
                                                    <tr key={idx} className={isDuplicate ? 'import-row-duplicate' : 'import-row-new'}>
                                                        <td>{idx + 1}</td>
                                                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.containerNo}</td>
                                                        <td>{c.containerType}</td>
                                                        <td>
                                                            {isDuplicate ? (
                                                                <span className="import-badge import-badge-duplicate">
                                                                    <AlertTriangle size={12} /> Duplicate
                                                                </span>
                                                            ) : (
                                                                <span className="import-badge import-badge-new">
                                                                    <CheckCircle size={12} /> New
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="import-alert import-alert-warning">
                                    <AlertTriangle size={16} />
                                    <span>No containers found in the pasted text.</span>
                                </div>
                            )}

                            {/* Import Button */}
                            {parsedData.containers && parsedData.containers.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px', alignItems: 'center' }}>
                                    {duplicates.length > 0 && (
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            {duplicates.length} duplicate{duplicates.length !== 1 ? 's' : ''} will be skipped
                                        </span>
                                    )}
                                    <button
                                        className={`btn btn-primary ${isSaving ? 'loading' : ''}`}
                                        onClick={handleImport}
                                        disabled={isSaving || newContainerCount === 0}
                                        style={{
                                            padding: '12px 32px',
                                            fontSize: '1rem',
                                            opacity: (isSaving || newContainerCount === 0) ? 0.5 : 1
                                        }}
                                    >
                                        <Upload size={18} /> {isSaving ? 'Importing...' : `Import ${newContainerCount} Container${newContainerCount !== 1 ? 's' : ''}`}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
