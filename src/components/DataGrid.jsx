import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

const COLUMNS = [
    { key: 'nusaRef', label: 'Nusa Ref.', type: 'text', grouped: true, width: '150px', readOnly: true },
    { key: 'jetRef', label: 'Jet Ref.', type: 'text', grouped: true, width: '150px', readOnly: true },
    { key: 'containerNo', label: 'Container No.', type: 'text', width: '150px', readOnly: true },
    { key: 'eta', label: 'ETA', type: 'date', width: '150px' },
    { key: 'availableDate', label: 'Available Date', type: 'date', width: '150px' },
    { key: 'priority', label: 'Priority', type: 'checkbox', width: '150px' },
    { key: 'deliveryDate', label: 'Delivery Date', type: 'date', width: '150px' },
    { key: 'time', label: 'Time', type: 'timepicker', width: '150px' },
    { key: 'confirm', label: 'Confirm?', type: 'checkbox', width: '150px' },
    { key: 'remarks', label: 'Remarks', type: 'textarea', width: '313px' },
    { key: 'jetComment', label: 'Jet Comment', type: 'textarea', width: '313px' },
    { key: 'clearCustoms', label: 'Clear Customs', type: 'checkbox', width: '150px' },
    { key: 'deliveryOrder', label: 'Delivery Order', type: 'checkbox', width: '150px' },
];

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [yyyy, mm, dd] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[parseInt(mm, 10) - 1];
    const yy = yyyy.toString().slice(-2);
    return `${parseInt(dd, 10)}-${month}-${yy}`;
};

const TimePickerCell = ({ value, onChange, disabled, style }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const wrapperRef = React.useRef(null);
    const options = ["Morning", "Midday", "Afternoon", "Night"];

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', height: '100%', width: '100%', ...style }}>
            <div style={{ display: 'flex', height: '100%', alignItems: 'center' }}>
                <input
                    type="text"
                    className="cell-input"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={(e) => {
                        setIsOpen(true);
                        e.target.parentElement.parentElement.parentElement.classList.add('cell-editing');
                    }}
                    onBlur={(e) => {
                        e.target.parentElement.parentElement.parentElement.classList.remove('cell-editing');
                    }}
                    readOnly={true}
                    disabled={disabled}
                    style={{ paddingRight: '48px' }}
                />

                {/* Native time picker layer */}
                <div style={{
                    position: 'absolute',
                    right: '25px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '100%',
                    cursor: disabled ? 'default' : 'pointer'
                }}>
                    {/* Custom Select overlay functioning as a pure 30-min time picker */}
                    <select
                        style={{
                            position: 'absolute',
                            opacity: 0,
                            width: '40px',
                            height: '100%',
                            right: 0,
                            cursor: disabled ? 'default' : 'pointer',
                            padding: 0,
                            margin: 0
                        }}
                        value=""
                        disabled={disabled}
                        onChange={(e) => {
                            if (e.target.value) {
                                onChange(e.target.value);
                                setIsOpen(false);
                            }
                        }}
                    >
                        <option value="" disabled>Select Time</option>
                        {Array.from({ length: 48 }).map((_, i) => {
                            const hours = String(Math.floor(i / 2)).padStart(2, '0');
                            const mins = i % 2 === 0 ? '00' : '30';
                            const timeStr = `${hours}:${mins}`;
                            return <option key={timeStr} value={timeStr}>{timeStr}</option>;
                        })}
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                </div>

                {/* Dropdown Button (Arrow) */}
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsOpen(!isOpen);
                    }}
                    disabled={disabled}
                    style={{
                        position: 'absolute',
                        right: '4px',
                        background: 'none',
                        border: 'none',
                        cursor: disabled ? 'default' : 'pointer',
                        color: 'var(--text-secondary)',
                        padding: '4px',
                        fontSize: '10px'
                    }}
                >
                    ▼
                </button>
            </div>
            {
                isOpen && !disabled && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        boxShadow: 'var(--shadow)',
                        zIndex: 100,
                        maxHeight: '180px',
                        overflowY: 'auto'
                    }}>
                        {options.map(opt => (
                            <div
                                key={opt}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    color: 'var(--text-primary)',
                                    textAlign: 'left',
                                    borderBottom: '1px solid var(--border-color)'
                                }}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onChange(opt);
                                    setIsOpen(false);
                                }}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.05)'}
                                onMouseLeave={(e) => e.target.style.background = 'white'}
                            >
                                {opt}
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    );
};

export default function DataGrid({ data, onRowChange }) {
    const [editingCell, setEditingCell] = React.useState(null);
    const handleCellChange = (rowIndex, colKey, value) => {
        const updatedRow = { ...data[rowIndex], [colKey]: value };
        onRowChange(updatedRow);
    };

    // Calculate row spans for consecutive identical grouped columns (nusaRef & jetRef)
    const groupSpans = useMemo(() => {
        const spans = new Array(data.length).fill(1);
        for (let i = 0; i < data.length; i++) {
            if (spans[i] === 0) continue; // Already marked to be collapsed

            let span = 1;
            for (let j = i + 1; j < data.length; j++) {
                // If they share the exact same nusaRef and jetRef, group them
                const sameNusa = data[i].nusaRef === data[j].nusaRef && data[i].nusaRef;
                const sameJet = data[i].jetRef === data[j].jetRef && data[i].jetRef;

                if (sameNusa && sameJet) {
                    span++;
                    spans[j] = 0; // 0 means do not render this cell for grouped columns
                } else {
                    break;
                }
            }
            spans[i] = span;
        }
        return spans;
    }, [data]);

    return (
        <div className="grid-container">
            <table>
                <thead>
                    <tr>
                        {COLUMNS.map(col => (
                            <th key={col.key} style={{ minWidth: col.width, width: col.width }}>{col.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => {
                        const rowSpan = groupSpans[rowIndex];
                        const isOmitted = rowSpan === 0;

                        return (
                            <tr key={row.id || rowIndex}>
                                {COLUMNS.map(col => {
                                    // If column is grouped and this row is part of a previous group, omit throwing the <td>
                                    if (col.grouped && isOmitted) {
                                        return null;
                                    }

                                    const tdProps = {};
                                    if (col.grouped && rowSpan > 1) {
                                        tdProps.rowSpan = rowSpan;
                                    }

                                    return (
                                        <td key={col.key} {...tdProps} style={col.grouped ? { verticalAlign: 'middle', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--panel-bg)' } : {}}>
                                            {col.type === 'checkbox' ? (
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        className="custom-checkbox"
                                                        checked={!!row[col.key]}
                                                        onChange={(e) => handleCellChange(rowIndex, col.key, e.target.checked)}
                                                    />
                                                </div>
                                            ) : col.type === 'date' ? (
                                                <input
                                                    type="date"
                                                    className="cell-input cell-date-input"
                                                    value={row[col.key] || ''}
                                                    data-date={formatDate(row[col.key])}
                                                    onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                                                    onKeyDown={(e) => e.preventDefault()}
                                                    onFocus={(e) => e.target.parentElement.classList.add('cell-editing')}
                                                    onBlur={(e) => e.target.parentElement.classList.remove('cell-editing')}
                                                    disabled={col.grouped && rowSpan > 1}
                                                    style={col.grouped && rowSpan > 1 ? { textAlign: 'center', pointerEvents: 'none' } : {}}
                                                />
                                            ) : col.type === 'textarea' ? (
                                                <textarea
                                                    className="cell-input"
                                                    value={row[col.key] || ''}
                                                    onChange={(e) => {
                                                        handleCellChange(rowIndex, col.key, e.target.value);
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.parentElement.classList.add('cell-editing');
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                    }}
                                                    onBlur={(e) => e.target.parentElement.classList.remove('cell-editing')}
                                                    rows={1}
                                                    disabled={col.grouped && rowSpan > 1}
                                                    style={col.grouped && rowSpan > 1 ? { textAlign: 'center', pointerEvents: 'none', height: 'auto', overflow: 'hidden' } : { height: 'auto', overflow: 'hidden' }}
                                                />
                                            ) : col.type === 'timepicker' ? (
                                                <TimePickerCell
                                                    value={row[col.key]}
                                                    onChange={(val) => handleCellChange(rowIndex, col.key, val)}
                                                    disabled={col.grouped && rowSpan > 1}
                                                    style={col.grouped && rowSpan > 1 ? { textAlign: 'center', pointerEvents: 'none' } : {}}
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="cell-input"
                                                    value={row[col.key] || ''}
                                                    onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                                                    onFocus={(e) => e.target.parentElement.classList.add('cell-editing')}
                                                    onBlur={(e) => e.target.parentElement.classList.remove('cell-editing')}
                                                    readOnly={col.readOnly}
                                                    disabled={col.grouped && rowSpan > 1}
                                                    style={col.grouped && rowSpan > 1 ? { textAlign: 'center', pointerEvents: 'none' } : {}}
                                                />
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={COLUMNS.length} style={{ textAlign: 'center', padding: '32px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                                    <AlertCircle size={32} opacity={0.5} />
                                    <p>No shipments found. Click "Add Container" to get started.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
