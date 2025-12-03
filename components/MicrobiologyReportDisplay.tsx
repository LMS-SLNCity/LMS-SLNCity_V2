import React from 'react';
import { VisitTest, Visit } from '../types';
import { useAppContext } from '../context/AppContext';

interface MicrobiologyReportDisplayProps {
    test: VisitTest;
    visit: Visit;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

export const MicrobiologyReportDisplay: React.FC<MicrobiologyReportDisplayProps> = ({ test, visit }) => {
    const { antibiotics } = useAppContext();
    if (!test.cultureResult) {
        return <div style={{ fontSize: 12, color: '#d32f2f', padding: 6 }}>Culture result data is missing.</div>;
    }

    const { growthStatus, organismIsolated, colonyCount, sensitivity, remarks } = test.cultureResult;
    
    const sensitiveTo = (sensitivity || []).filter(s => s.sensitivity === 'S');
    const intermediateTo = (sensitivity || []).filter(s => s.sensitivity === 'I');
    const resistantTo = (sensitivity || []).filter(s => s.sensitivity === 'R');

    const getAntibioticName = (id: number) => antibiotics.find(ab => ab.id === id)?.name || 'Unknown';

    return (
        <div style={{ marginTop: 6, fontSize: 11, padding: 6, borderLeft: '1px solid #000', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <h4 style={{ fontWeight: 700, fontSize: 12, textDecoration: 'underline' }}>Culture and Sensitivity Report</h4>
            </div>

            {growthStatus === 'no_growth' ? (
                <div style={{ textAlign: 'center', paddingTop: 12, paddingBottom: 12 }}>
                    <p style={{ fontWeight: 700, color: '#333' }}>Organism Isolated: No growth occurred.</p>
                    {remarks && <p style={{ marginTop: 6, color: '#666' }}>Remarks: {remarks}</p>}
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginBottom: 8 }}>
                        <div><span style={{ fontWeight: 600 }}>Source of specimen:</span> {test.specimen_type}</div>
                        <div><span style={{ fontWeight: 600 }}>Sample collection date:</span> {formatDate(test.collectedAt)}</div>
                        <div><span style={{ fontWeight: 600 }}>Reporting date:</span> {formatDate(test.approvedAt)}</div>
                    </div>
                    
                    <div style={{ marginBottom: 8 }}>
                        <span style={{ fontWeight: 600 }}>Organism isolated:</span> 
                        <span style={{ marginLeft: 6, fontWeight: 700 }}>{organismIsolated} {colonyCount && `> ${colonyCount} CFU/ml.`}</span>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                        <thead>
                            <tr style={{ background: '#f0f0f0' }}>
                                <th style={{ border: '1px solid #000', padding: 6, fontWeight: 600 }}>Sensitive To</th>
                                <th style={{ border: '1px solid #000', padding: 6, fontWeight: 600 }}>Intermediate To</th>
                                <th style={{ border: '1px solid #000', padding: 6, fontWeight: 600 }}>Resistant To</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: 6, verticalAlign: 'top' }}>
                                    <ul style={{ listStyleType: 'disc', marginLeft: 20, margin: 0, padding: 0, lineHeight: 1.4 }}>
                                        {sensitiveTo.map(s => <li key={s.antibioticId} style={{ margin: '2px 0' }}>{getAntibioticName(s.antibioticId)}</li>)}
                                        {sensitiveTo.length === 0 && <span style={{ color: '#999' }}>-</span>}
                                    </ul>
                                </td>
                                <td style={{ border: '1px solid #000', padding: 6, verticalAlign: 'top' }}>
                                    <ul style={{ listStyleType: 'disc', marginLeft: 20, margin: 0, padding: 0, lineHeight: 1.4 }}>
                                        {intermediateTo.map(s => <li key={s.antibioticId} style={{ margin: '2px 0' }}>{getAntibioticName(s.antibioticId)}</li>)}
                                        {intermediateTo.length === 0 && <span style={{ color: '#999' }}>-</span>}
                                    </ul>
                                </td>
                                <td style={{ border: '1px solid #000', padding: 6, verticalAlign: 'top' }}>
                                    <ul style={{ listStyleType: 'disc', marginLeft: 20, margin: 0, padding: 0, lineHeight: 1.4 }}>
                                        {resistantTo.map(s => <li key={s.antibioticId} style={{ margin: '2px 0' }}>{getAntibioticName(s.antibioticId)}</li>)}
                                        {resistantTo.length === 0 && <span style={{ color: '#999' }}>-</span>}
                                    </ul>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </>
            )}
             <div style={{ marginTop: 12 }}>
                <p style={{ fontWeight: 600 }}>* Correlate clinically.</p>
                <p>If there is a need kindly discuss.</p>
            </div>
        </div>
    );
};
