import React, { useEffect, useRef, useState } from 'react';
import { Visit, VisitTest, Signatory, Approver } from '../types';
import { useAppContext } from '../context/AppContext';
import { API_BASE_URL } from '../config/api';
import { MicrobiologyReportDisplay } from './MicrobiologyReportDisplay';

/*
  TestReport.tsx
  - Named export: export const TestReport
  - Culture tests ALWAYS start on their own page
  - Row-count pagination to avoid splitting tests across pages
*/

/* ----------------------- Helpers & Constants ----------------------- */

const DEFAULT_MICROBIOLOGY_BLOCK_ROWS = 12;
const HEADER_ROWS_RESERVE = 8;
const FOOTER_ROWS_RESERVE = 6;
const CONTENT_ROWS_PER_PAGE = 42 - HEADER_ROWS_RESERVE - FOOTER_ROWS_RESERVE; // adjust if needed

const formatAge = (p: Visit['patient']) => {
  if (!p) return 'N/A';
  if (p.age_years > 0) return `${p.age_years} Year(s)`;
  if (p.age_months > 0) return `${p.age_months} Month(s)`;
  if (p.age_days > 0) return `${p.age_days} Day(s)`;
  return 'N/A';
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const isCultureTest = (test: VisitTest) => !!test.cultureResult;

const estimateMicrobiologyRows = (test: VisitTest) => {
  try {
    const r: any = test.cultureResult as any;
    if (!r) return DEFAULT_MICROBIOLOGY_BLOCK_ROWS;
    if (Array.isArray(r.lines) && r.lines.length > 0) return Math.max(DEFAULT_MICROBIOLOGY_BLOCK_ROWS, r.lines.length + 4);
    if (typeof r.description === 'string') {
      const lines = r.description.split(/\r?\n/).filter(Boolean).length;
      return Math.max(DEFAULT_MICROBIOLOGY_BLOCK_ROWS, lines + 4);
    }
  } catch { /* ignore */ }
  return DEFAULT_MICROBIOLOGY_BLOCK_ROWS;
};

const countDisplayRowsForTest = (test: VisitTest) => {
  let rows = 1; // test title
  const fields = test.template?.parameters?.fields || [];
  rows += Math.max(1, fields.length); // if no params, show 1 row "No parameters"
  if (isCultureTest(test)) return Math.max(rows, estimateMicrobiologyRows(test));
  return rows;
};

/* ----------------------- Pagination Types & Algorithm ----------------------- */

interface PageGroup {
  department: string;
  tests: VisitTest[];
  displayRows: number; // includes group header
}

interface ReportPage {
  pageNumber: number;
  groups: PageGroup[];
  usedRows: number;
}

const createReportPages = (testsByCategory: Record<string, VisitTest[]>) => {
  const pages: ReportPage[] = [];
  let currentPage: ReportPage = { pageNumber: 1, groups: [], usedRows: 0 };
  const usableRows = CONTENT_ROWS_PER_PAGE;

  const pushPage = () => {
    if (currentPage.groups.length > 0) pages.push(currentPage);
    currentPage = { pageNumber: pages.length + 1, groups: [], usedRows: 0 };
  };

  Object.entries(testsByCategory).forEach(([department, tests]) => {
    tests.forEach((test) => {
      const isCulture = isCultureTest(test);
      const testRows = countDisplayRowsForTest(test);

      // Culture test MUST start on a fresh page (Option A)
      if (isCulture) {
        if (currentPage.groups.length > 0) pushPage();
        const cultureRows = Math.max(testRows, estimateMicrobiologyRows(test));
        const group: PageGroup = { department, tests: [test], displayRows: cultureRows + 1 }; // +1 group header
        currentPage.groups.push(group);
        currentPage.usedRows += group.displayRows;
        // save this page and start a new one for subsequent tests
        pushPage();
        return;
      }

      // Non-culture test handling
      const existing = currentPage.groups.find(g => g.department === department);

      if (existing) {
        // If adding this test exceeds usable rows -> new page
        if (currentPage.usedRows + testRows > usableRows) {
          pushPage();
          const newGroup: PageGroup = { department, tests: [test], displayRows: testRows + 1 };
          currentPage.groups.push(newGroup);
          currentPage.usedRows += newGroup.displayRows;
        } else {
          // append to existing
          existing.tests.push(test);
          existing.displayRows += testRows;
          currentPage.usedRows += testRows;
        }
      } else {
        // Department not on current page
        const groupHeaderAndTest = 1 + testRows;
        if (currentPage.groups.length > 0 && currentPage.usedRows + groupHeaderAndTest > usableRows) {
          pushPage();
        }
        const newGroup: PageGroup = { department, tests: [test], displayRows: groupHeaderAndTest };
        currentPage.groups.push(newGroup);
        currentPage.usedRows += groupHeaderAndTest;
      }
    });
  });

  if (currentPage.groups.length > 0) pages.push(currentPage);

  // Basic verification (dev-time console)
  try {
    const totalTestsInPages = pages.reduce((s, p) => s + p.groups.reduce((gs, g) => gs + g.tests.length, 0), 0);
    const totalTestsOriginal = Object.values(testsByCategory).reduce((s, arr) => s + arr.length, 0);
    if (totalTestsInPages !== totalTestsOriginal) {
      // Only console error — does not throw in production
      // eslint-disable-next-line no-console
      console.error('PAGINATION MISMATCH', { totalTestsOriginal, totalTestsInPages, pages });
    }
  } catch { /* ignore */ }

  return pages;
};

/* ----------------------- Barcode Component (lazy) ----------------------- */

const BarcodeComponent: React.FC<{ value: string }> = ({ value }) => {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!barcodeRef.current || typeof window === 'undefined') return;
    let cancelled = false;
    import('jsbarcode')
      .then((JsBarcode) => {
        if (cancelled) return;
        if (barcodeRef.current) {
          JsBarcode.default(barcodeRef.current, value, {
            format: 'CODE128',
            width: 1,
            height: 25,
            displayValue: false,
          });
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Error loading jsbarcode', err);
      });
    return () => { cancelled = true; };
  }, [value]);

  return <svg ref={barcodeRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />;
};

/* ----------------------- Main Component ----------------------- */

interface TestReportProps {
  visit: Visit;
  signatory?: Signatory | null;
}

export const TestReport: React.FC<TestReportProps> = ({ visit, signatory = null }) => {
  const { visitTests } = useAppContext();
  const [approvers, setApprovers] = useState<Approver[]>([]);

  if (!visit) {
    return <div className="bg-white p-8 max-w-4xl mx-auto text-red-500">Error: Visit data not found.</div>;
  }

  // Only include APPROVED or PRINTED tests (support reprint)
  const approvedTestsForVisit = visit.tests
    .map((testId: number) => visitTests.find(vt => vt.id === testId && (vt.status === 'APPROVED' || vt.status === 'PRINTED')))
    .filter(Boolean) as VisitTest[];

  if (approvedTestsForVisit.length === 0) {
    return <div className="bg-white p-8 max-w-4xl mx-auto text-yellow-600">Report not ready. No approved or printed tests found for this visit.</div>;
  }

  const firstTest = approvedTestsForVisit[0];

  const doctorName = visit.referred_doctor_name
    ? (visit.referred_doctor_designation ? `${visit.referred_doctor_name}, ${visit.referred_doctor_designation}` : visit.referred_doctor_name)
    : (visit.other_ref_doctor || 'N/A');

  // Group tests by category / department
  const testsByCategory = approvedTestsForVisit.reduce((acc, test) => {
    const category = test.template?.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(test);
    return acc;
  }, {} as Record<string, VisitTest[]>);

  const reportPages = createReportPages(testsByCategory);

  // Fetch approvers (optimized: attempt to deduce approvers from tests; fallback to /approvers)
  useEffect(() => {
    let mounted = true;

    const fetchApprovers = async () => {
      try {
        const approverUsernames = [...new Set(approvedTestsForVisit.map(t => t.approvedBy).filter(Boolean))] as string[];

        // If no approvers listed in tests -> fallback to /approvers endpoint
        if (approverUsernames.length === 0) {
          const resp = await fetch(`${API_BASE_URL}/approvers`);
          const data = await resp.json();
          if (!mounted) return;
          setApprovers((data || []).filter((a: Approver) => a.show_on_print));
          return;
        }

        // Fetch users once and map to approvers (single request)
        const authToken = (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem('authToken') : null;
        const respUsers = await fetch(`${API_BASE_URL}/users`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });
        const users = await respUsers.json();
        if (!mounted) return;

        const fetchedApprovers = approverUsernames.map((username) => {
          const user = users.find((u: any) => u.username === username || u.display_name === username);
          if (!user) return null;
          return {
            id: user.id,
            name: user.display_name || user.username,
            title: user.role || user.designation || '-',
            signature_image_url: user.signature_image_url,
            show_on_print: true
          } as Approver;
        }).filter(Boolean) as Approver[];

        if (fetchedApprovers.length === 0) {
          const resp = await fetch(`${API_BASE_URL}/approvers`);
          const data = await resp.json();
          if (!mounted) return;
          setApprovers((data || []).filter((a: Approver) => a.show_on_print));
          return;
        }

        setApprovers(fetchedApprovers);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching approvers', err);
        try {
          const resp = await fetch(`${API_BASE_URL}/approvers`);
          const data = await resp.json();
          if (mounted) setApprovers((data || []).filter((a: Approver) => a.show_on_print));
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Fallback approvers fetch failed', e);
        }
      }
    };

    fetchApprovers();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit.id]); // run when visit changes

  // Derive sample drawn and reported dates
  const testsForVisit = visitTests.filter(t => visit.tests.includes(t.id));
  const sampleDrawnDate = testsForVisit.map(t => t.collectedAt).filter(Boolean).sort()[0];
  const reportedDate = testsForVisit.map(t => t.approvedAt).filter(Boolean).sort()[0];

  const IMAGE_BASE_URL = API_BASE_URL.replace('/api', '');

  /* ----------------------- Render pages ----------------------- */
  return (
    <>
      <style>{`
        /* minimal print-friendly styles - app can override */
        .report-page { background: #fff; box-sizing: border-box; }
        @media print {
          .report-page { page-break-after: always; }
        }
      `}</style>

      {reportPages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className="report-page"
          style={{
            minWidth: '210mm',
            maxWidth: '210mm',
            padding: '12mm',
            margin: '0 auto',
            pageBreakAfter: pageIndex < reportPages.length - 1 ? 'always' : 'auto',
            color: '#000',
            background: '#fff'
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 8, borderBottom: '1px solid #ccc', paddingBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div><strong>Patient Name:</strong> {visit.patient?.name || 'N/A'}</div>
                <div><strong>Age / Gender:</strong> {formatAge(visit.patient)} / {visit.patient?.sex || 'N/A'}</div>
                <div><strong>Referred By:</strong> {doctorName}</div>
              </div>

              <div style={{ width: 120 }}>
                <BarcodeComponent value={visit.visit_code || ''} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 6, fontSize: 12 }}>
              <div><strong>Visit Id</strong><div>{visit.visit_code}</div></div>
              <div><strong>Sample Drawn</strong><div>{formatDate(sampleDrawnDate)}</div></div>
              <div><strong>Registration</strong><div>{formatDate(visit.created_at)}</div></div>
              <div><strong>Reported</strong><div>{formatDate(reportedDate)}</div></div>
            </div>
          </div>

          {/* Page content groups */}
          {page.groups.map((group, gi) => (
            <div key={`${pageIndex}-${gi}`} style={{ marginBottom: 8 }}>
              <div style={{ background: '#eee', padding: 6, fontWeight: 700, textTransform: 'uppercase' }}>{group.department}</div>

              {group.tests.map((test) => (
                <div key={test.id} style={{ marginTop: 6 }}>
                  {isCultureTest(test) ? (
                    <div>
                      <MicrobiologyReportDisplay test={test} visit={visit} />
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', width: '40%', padding: 6, background: '#f3f3f3' }}>Test Description</th>
                          <th style={{ textAlign: 'center', width: '15%', padding: 6, background: '#f3f3f3' }}>Result</th>
                          <th style={{ textAlign: 'center', width: '15%', padding: 6, background: '#f3f3f3' }}>Units</th>
                          <th style={{ textAlign: 'left', width: '30%', padding: 6, background: '#f3f3f3' }}>Biological Reference Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ fontWeight: 700, background: '#fafafa' }}>
                          <td colSpan={4} style={{ padding: 8 }}>{test.template?.name}{test.specimen_type ? ` (Specimen: ${test.specimen_type})` : ''}</td>
                        </tr>

                        {test.template?.parameters?.fields && test.template.parameters.fields.length > 0 ? (
                          test.template.parameters.fields.map((param: any, idx: number) => (
                            param.type === 'heading' ? (
                              <tr key={`heading-${test.id}-${idx}`} style={{ background: '#f3f4f6' }}>
                                <td colSpan={4} style={{ fontWeight: 700, padding: 6 }}>{param.name}</td>
                              </tr>
                            ) : (
                              <tr key={`${test.id}-${param.name}`} >
                                <td style={{ padding: 6 }}>
                                  <div style={{ fontSize: 11 }}>{param.name}</div>
                                  {param.method && <div style={{ fontSize: 9, color: '#555' }}>({param.method})</div>}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 700 }}>{String(test.results?.[param.name] ?? '-')}</td>
                                <td style={{ textAlign: 'center' }}>{param.unit ?? ''}</td>
                                <td style={{ padding: 6 }}>{param.reference_range ?? ''}</td>
                              </tr>
                            )
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: 6 }}>No parameters</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Footer area */}
          <div style={{ borderTop: '1px solid #ccc', marginTop: 8, paddingTop: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              {approvers.length > 0 ? (
                approvers.map((a, idx) => (
                  <div key={a.id} style={{ textAlign: 'center', flex: 1 }}>
                    {a.signature_image_url ? (
                      <img src={`${IMAGE_BASE_URL}${a.signature_image_url}`} alt="signature" style={{ maxWidth: 90, maxHeight: 28 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div style={{ height: 20, borderBottom: '1px solid #666', marginBottom: 4 }} />
                    )}
                    <div style={{ fontWeight: 700, fontSize: 11 }}>{a.name}</div>
                    <div style={{ fontSize: 10 }}>{a.title}</div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ height: 20, borderBottom: '1px solid #666', marginBottom: 4 }} />
                  <div style={{ fontWeight: 700 }}>Lab Director</div>
                  <div style={{ fontSize: 10 }}>Pathologist</div>
                </div>
              )}

              {visit.qr_code && (
                <div style={{ textAlign: 'center', marginLeft: 12 }}>
                  <div style={{ width: 48, height: 48 }}>
                    <img src={visit.qr_code} alt="qr" style={{ width: '100%', height: '100%' }} />
                  </div>
                  <div style={{ fontSize: 9 }}>Scan to verify</div>
                </div>
              )}

              <div style={{ width: 120, textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 700 }}>{firstTest.enteredBy || 'N/A'}</div>
                <div style={{ fontSize: 9 }}>Lab Technician</div>
              </div>
            </div>

            <div style={{ marginTop: 6, fontSize: 10 }}>
              <div>Assay result should be correlated clinically with other laboratory finding and the total clinical status of the patient.</div>
              <div>Note :- This Report is subject to the terms and conditions mentioned overleaf</div>
              <div style={{ fontWeight: 700 }}>Note :- PARTIAL REPRODUCTION OF THIS REPORT IS NOT PERMITTED</div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 6, fontSize: 11 }}>Page {pageIndex + 1} of {reportPages.length}</div>
          </div>
        </div>
      ))}
    </>
  );
};
