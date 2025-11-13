// import React, { useEffect, useRef } from 'react';
// import { VisitTest, Visit, Signatory } from '../types';
// import { useAppContext } from '../context/AppContext';
// import { QRCodeSVG } from 'qrcode.react';

// // Barcode component
// const BarcodeComponent: React.FC<{ value: string }> = ({ value }) => {
//   const barcodeRef = useRef<SVGSVGElement>(null);

//   useEffect(() => {
//     if (barcodeRef.current && typeof window !== 'undefined') {
//       try {
//         import('jsbarcode').then((JsBarcode) => {
//           if (barcodeRef.current) {
//             JsBarcode.default(barcodeRef.current, value, {
//               format: 'CODE128',
//               width: 1.5,
//               height: 40,
//               displayValue: false,
//             });
//           }
//         });
//       } catch (error) {
//         console.error('Error generating barcode:', error);
//       }
//     }
//   }, [value]);

//   return <svg ref={barcodeRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }}></svg>;
// };

// interface TestReportProps {
//   visit: Visit;
//   signatory: Signatory;
//   canEdit: boolean;
//   onEdit: (test: VisitTest) => void;
// }

// const formatAge = (p: Visit['patient']) => {
//   if (p.age_years > 0) return `${p.age_years} Year(s)`;
//   if (p.age_months > 0) return `${p.age_months} Month(s)`;
//   if (p.age_days > 0) return `${p.age_days} Day(s)`;
//   return 'N/A';
// };

// const formatDate = (dateString?: string) => {
//   if (!dateString) return 'N/A';
//   return new Date(dateString).toLocaleString('en-GB', {
//     year: 'numeric',
//     month: '2-digit',
//     day: '2-digit',
//     hour: '2-digit',
//     minute: '2-digit'
//   }).replace(',', '');
// };

// export const TestReport: React.FC<TestReportProps> = ({ visit, signatory, canEdit, onEdit }) => {
//   const { visitTests } = useAppContext();

//   const approvedTestsForVisit = visit.tests
//     .map(testId => visitTests.find(vt => vt.id === testId && vt.status === 'APPROVED'))
//     .filter(Boolean) as VisitTest[];

//   if (!visit) {
//     return <div className="bg-white p-8 max-w-4xl mx-auto text-red-500">Error: Visit data not found.</div>;
//   }
//   if (approvedTestsForVisit.length === 0) {
//     return <div className="bg-white p-8 max-w-4xl mx-auto text-yellow-600">Report not ready. No approved tests found for this visit.</div>;
//   }

//   const firstTest = approvedTestsForVisit[0];
//   const doctorName = visit.referred_doctor_id ? `Dr. ID: ${visit.referred_doctor_id}` : visit.other_ref_doctor || 'N/A';

//   const testsByCategory = approvedTestsForVisit.reduce((acc, test) => {
//     const category = test.template.category || 'Uncategorized';
//     if (!acc[category]) {
//       acc[category] = [];
//     }
//     acc[category].push(test);
//     return acc;
//   }, {} as Record<string, VisitTest[]>);

//   return (
//     <>
//       <style>{`
//         @media print {
//           body {
//             -webkit-print-color-adjust: exact;
//             print-color-adjust: exact;
//             margin: 0;
//             padding: 0;
//           }
//           #test-report {
//             box-shadow: none !important;
//             max-width: 100% !important;
//             margin: 0 !important;
//             padding: 0.4in !important;
//           }
//           .screen-footer {
//             display: none !important;
//           }
//         }
//         table {
//           border-collapse: collapse;
//           width: 100%;
//         }
//         td, th {
//           border: 1px solid #000;
//           padding: 4px 6px;
//           text-align: left;
//         }
//         th {
//           background-color: #e5e5e5;
//           font-weight: bold;
//         }
//       `}</style>

//       <div id="test-report" className="bg-white max-w-4xl mx-auto" style={{ padding: '0.4in', fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>

//         {/* PATIENT INFORMATION - 2 Column Layout */}
//         <div className="flex justify-between mb-6 gap-8">
//           {/* LEFT COLUMN - Patient Details */}
//           <div className="flex-1 text-xs space-y-1">
//             <div className="flex">
//               <span className="font-bold">Patient Name</span>
//               <span className="ml-1">: {visit.patient.name}</span>
//             </div>
//             <div className="flex">
//               <span className="font-bold">Age / Gender</span>
//               <span className="ml-1">: {formatAge(visit.patient)} / {visit.patient.sex}</span>
//             </div>
//             <div className="flex">
//               <span className="font-bold">Sample Type</span>
//               <span className="ml-1">: {visit.sample_type || 'N/A'}</span>
//             </div>
//             <div className="flex">
//               <span className="font-bold">Client Code</span>
//               <span className="ml-1">: {visit.ref_customer_id || 'N/A'}</span>
//             </div>
//             <div className="flex">
//               <span className="font-bold">Referred By</span>
//               <span className="ml-1">: {doctorName}</span>
//             </div>
//           </div>

//           {/* RIGHT COLUMN - Barcode + Patient ID + Dates */}
//           <div className="flex flex-col items-end text-xs space-y-2">
//             {/* Barcode */}
//             <div className="w-40">
//               <BarcodeComponent value={visit.visit_code} />
//             </div>

//             {/* Patient ID and Dates */}
//             <div className="text-right space-y-0.5 text-xs">
//               <div>
//                 <span className="font-bold">Patient Id</span>
//                 <span className="ml-2">{visit.visit_code}</span>
//               </div>
//               <div>
//                 <span className="font-bold">Sample Drawn Date</span>
//                 <span className="ml-2">{formatDate(visit.sample_drawn_datetime)}</span>
//               </div>
//               <div>
//                 <span className="font-bold">Registration Date</span>
//                 <span className="ml-2">{formatDate(visit.registration_datetime)}</span>
//               </div>
//               <div>
//                 <span className="font-bold">Reported Date</span>
//                 <span className="ml-2">{formatDate(firstTest.approvedAt)}</span>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* TEST RESULTS SECTION */}
//         <div className="mt-6">
//           {Object.entries(testsByCategory).map(([category, tests]) => (
//             <div key={category} className="mb-4">
//               {/* Category Header - Gray Background */}
//               <div className="bg-gray-300 border border-black py-1 px-2 mb-2">
//                 <h3 className="font-bold text-sm text-black uppercase">{category}</h3>
//               </div>

//               {/* Results Table */}
//               <table className="w-full text-xs border border-black mb-4">
//                 <thead>
//                   <tr className="bg-gray-300">
//                     <th className="border border-black px-3 py-2 text-left">TEST DESCRIPTION</th>
//                     <th className="border border-black px-3 py-2 text-center w-20">RESULT</th>
//                     <th className="border border-black px-3 py-2 text-center w-20">UNITS</th>
//                     <th className="border border-black px-3 py-2 text-left">BIOLOGICAL REFERENCE RANGE</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {tests.map(test => (
//                     <React.Fragment key={test.id}>
//                       {/* Test Name Row - Bold */}
//                       <tr>
//                         <td colSpan={4} className="border border-black px-3 py-1 font-bold bg-white">
//                           {test.template.name}
//                         </td>
//                       </tr>
//                       {/* Parameter Rows */}
//                       {test.template.parameters?.fields && test.template.parameters.fields.length > 0 ? (
//                         test.template.parameters.fields.map(param => (
//                           <tr key={param.name}>
//                             <td className="border border-black px-3 py-1">{param.name}</td>
//                             <td className="border border-black px-3 py-1 font-bold text-center">{String(test.results?.[param.name] ?? '-')}</td>
//                             <td className="border border-black px-3 py-1 text-center">{param.unit || ''}</td>
//                             <td className="border border-black px-3 py-1">{param.reference_range || ''}</td>
//                           </tr>
//                         ))
//                       ) : (
//                         <tr>
//                           <td colSpan={4} className="border border-black px-3 py-1 text-center">No parameters</td>
//                         </tr>
//                       )}
//                     </React.Fragment>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           ))}
//         </div>

//         {/* END OF REPORT */}
//         <div className="text-center font-bold text-xs mt-4 py-2">
//           ** End of Report **
//         </div>

//         {/* FOOTER - Print View */}
//         <div className="hidden print:block mt-6 pt-4 border-t-2 border-black">
//           {/* Signature Section - 3 Columns */}
//           <div className="grid grid-cols-3 gap-8 text-center mt-4 mb-4">
//             {/* Left - Signature Line */}
//             <div>
//               <div className="h-8 border-b-2 border-black mb-1"></div>
//               <p className="font-bold text-xs">DR MISBHA LATEEFA, MD</p>
//               <p className="text-xs text-gray-700">Consultant Pathologist</p>
//             </div>

//             {/* Center - QR Code */}
//             <div className="flex flex-col items-center">
//               <div className="bg-white p-1 border border-gray-300 rounded mb-2">
//                 <QRCodeSVG
//                   value={`${window.location.origin}/verify-report/${visit.visit_code}`}
//                   size={50}
//                   level="H"
//                   includeMargin={false}
//                 />
//               </div>
//               <p className="text-xs text-gray-700">{visit.visit_code}</p>
//             </div>

//             {/* Right - Signatory */}
//             <div>
//               <div className="h-8 border-b-2 border-black mb-1"></div>
//               <p className="font-bold text-xs">T.V. SUBBARAO</p>
//               <p className="text-xs text-gray-700">M.Sc., Bio-Chemist</p>
//             </div>
//           </div>

//           {/* Disclaimer & Notes */}
//           <div className="text-xs text-gray-700 mt-3 pt-2 border-t border-black space-y-1">
//             <p>Assay result should be correlated clinically with other laboratory finding and the total clinical status of the patient.</p>
//             <p>Note :- This Report is subject to the terms and conditions mentioned overleaf</p>
//             <p>Note :- PARTIAL REPRODUCTION OF THIS REPORT IS NOT PERMITTED</p>
//           </div>

//           {/* Page Number */}
//           <div className="text-center text-xs mt-3 pt-2 border-t border-black">
//             <p>Page 1 of 1</p>
//           </div>
//         </div>

//         {/* FOOTER - Screen View */}
//         <div className="screen-footer mt-6 pt-4 border-t-2 border-black">
//           <div className="grid grid-cols-3 gap-6 mt-4">
//             {/* Left - Signature */}
//             <div className="flex flex-col items-center">
//               <div className="border-b border-black w-32 mb-2"></div>
//               <p className="font-bold text-xs">{signatory.name}</p>
//               <p className="text-xs text-gray-600">{signatory.title}</p>
//             </div>

//             {/* Center - QR Code */}
//             <div className="flex flex-col items-center">
//               <div className="bg-white p-1 border border-gray-300 rounded mb-2">
//                 <QRCodeSVG
//                   value={`${window.location.origin}/verify-report/${visit.visit_code}`}
//                   size={60}
//                   level="H"
//                   includeMargin={true}
//                 />
//               </div>
//               <p className="text-xs text-gray-700">{visit.visit_code}</p>
//             </div>

//             {/* Right - Notes */}
//             <div className="text-xs text-gray-700 space-y-1 flex flex-col justify-center">
//               <p>Assay result should be correlated clinically with other laboratory finding and the total clinical status of the patient.</p>
//               <p>Note :- This Report is subject to the terms and conditions mentioned overleaf</p>
//               <p>Note :- PARTIAL REPRODUCTION OF THIS REPORT IS NOT PERMITTED</p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

import React, { useEffect, useRef, useState } from 'react';
import { VisitTest, Visit, Signatory, Approver } from '../types';
import { useAppContext } from '../context/AppContext';
import { API_BASE_URL } from '../config/api';
import { MicrobiologyReportDisplay } from './MicrobiologyReportDisplay';

// Barcode component using jsbarcode - SMALLER SIZE
const BarcodeComponent: React.FC<{ value: string }> = ({ value }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && typeof window !== 'undefined') {
      try {
        import('jsbarcode').then((JsBarcode) => {
          if (barcodeRef.current) {
            JsBarcode.default(barcodeRef.current, value, {
              format: 'CODE128',
              width: 1,
              height: 25,
              displayValue: false,
            });
          }
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value]);

  return <svg ref={barcodeRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }}></svg>;
};

// Helper functions
const formatAge = (p: Visit['patient']) => {
  if (p.age_years > 0) return `${p.age_years} Year(s)`;
  if (p.age_months > 0) return `${p.age_months} Month(s)`;
  if (p.age_days > 0) return `${p.age_days} Day(s)`;
  return 'N/A';
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(',', '');
};

// Pagination types and logic
interface PageGroup {
  department: string;
  tests: VisitTest[];
  parameterCount: number;
}

interface ReportPage {
  pageNumber: number;
  groups: PageGroup[];
  totalParameters: number;
}

// Calculate how many parameters a test has
const getTestParameterCount = (test: VisitTest): number => {
  return test.template.parameters?.fields?.length || 0;
};

// Estimate if tests can fit on one page
// Rough estimate: ~18-20 parameters per page (considering headers, footers, spacing)
const MAX_PARAMETERS_PER_PAGE = 18;
const MAX_PARAMETERS_FOR_SINGLE_TEST = 15; // If a test has more than this, give it its own page

// Create pages with proper department grouping
const createReportPages = (testsByCategory: Record<string, VisitTest[]>): ReportPage[] => {
  const pages: ReportPage[] = [];
  let currentPage: ReportPage = { pageNumber: 1, groups: [], totalParameters: 0 };

  // Process each department
  Object.entries(testsByCategory).forEach(([department, tests]) => {
    // Calculate total parameters for this department
    const departmentParamCount = tests.reduce((sum, test) => sum + getTestParameterCount(test), 0);

    // Check if any single test in this department is too large
    const hasLargeTest = tests.some(test => getTestParameterCount(test) > MAX_PARAMETERS_FOR_SINGLE_TEST);

    if (hasLargeTest) {
      // Process each test individually
      tests.forEach(test => {
        const paramCount = getTestParameterCount(test);

        if (paramCount > MAX_PARAMETERS_FOR_SINGLE_TEST) {
          // Large test gets its own page
          if (currentPage.groups.length > 0) {
            pages.push(currentPage);
            currentPage = { pageNumber: pages.length + 1, groups: [], totalParameters: 0 };
          }

          pages.push({
            pageNumber: pages.length + 1,
            groups: [{ department, tests: [test], parameterCount: paramCount }],
            totalParameters: paramCount
          });
        } else {
          // Small test - try to fit with others
          if (currentPage.totalParameters + paramCount > MAX_PARAMETERS_PER_PAGE) {
            // Start new page
            pages.push(currentPage);
            currentPage = { pageNumber: pages.length + 1, groups: [], totalParameters: 0 };
          }

          // Add to current page
          const existingGroup = currentPage.groups.find(g => g.department === department);
          if (existingGroup) {
            existingGroup.tests.push(test);
            existingGroup.parameterCount += paramCount;
          } else {
            currentPage.groups.push({ department, tests: [test], parameterCount: paramCount });
          }
          currentPage.totalParameters += paramCount;
        }
      });
    } else {
      // All tests in department are small - try to keep together
      if (currentPage.totalParameters + departmentParamCount > MAX_PARAMETERS_PER_PAGE) {
        // Department doesn't fit on current page
        if (currentPage.groups.length > 0) {
          pages.push(currentPage);
          currentPage = { pageNumber: pages.length + 1, groups: [], totalParameters: 0 };
        }

        // Check if entire department fits on one page
        if (departmentParamCount <= MAX_PARAMETERS_PER_PAGE) {
          // Entire department on one page
          currentPage.groups.push({ department, tests, parameterCount: departmentParamCount });
          currentPage.totalParameters = departmentParamCount;
        } else {
          // Department needs to be split across pages
          let remainingTests = [...tests];
          while (remainingTests.length > 0) {
            let pageParamCount = 0;
            const pageTests: VisitTest[] = [];

            while (remainingTests.length > 0 && pageParamCount + getTestParameterCount(remainingTests[0]) <= MAX_PARAMETERS_PER_PAGE) {
              const test = remainingTests.shift()!;
              pageTests.push(test);
              pageParamCount += getTestParameterCount(test);
            }

            if (pageTests.length > 0) {
              currentPage.groups.push({ department, tests: pageTests, parameterCount: pageParamCount });
              currentPage.totalParameters = pageParamCount;

              if (remainingTests.length > 0) {
                pages.push(currentPage);
                currentPage = { pageNumber: pages.length + 1, groups: [], totalParameters: 0 };
              }
            }
          }
        }
      } else {
        // Department fits on current page
        currentPage.groups.push({ department, tests, parameterCount: departmentParamCount });
        currentPage.totalParameters += departmentParamCount;
      }
    }
  });

  // Add last page if it has content
  if (currentPage.groups.length > 0) {
    pages.push(currentPage);
  }

  return pages;
};

interface TestReportProps {
  visit: Visit;
  signatory: Signatory;
  canEdit: boolean;
  onEdit: (test: VisitTest) => void;
}

export const TestReport: React.FC<TestReportProps> = ({ visit, signatory }) => {
  const { visitTests } = useAppContext();
  const [approvers, setApprovers] = useState<Approver[]>([]);

  // Get all tests for this visit
  const testsForVisit = visitTests.filter(t => visit.tests.includes(t.id));

  // Get the earliest collection date from all tests
  const sampleDrawnDate = testsForVisit
    .map(t => t.collectedAt)
    .filter(date => date)
    .sort()[0];

  // Get unique sample types from all tests (comma-separated if multiple)
  const sampleTypes = [...new Set(testsForVisit.map(t => t.specimen_type).filter(Boolean))].join(', ');

  // Get base URL for images (remove /api suffix)
  const IMAGE_BASE_URL = API_BASE_URL.replace('/api', '');

  // Fetch actual approvers who approved tests for this visit - OPTIMIZED to run only once
  useEffect(() => {
    let isMounted = true;

    const fetchActualApprovers = async () => {
      try {
        // Get all approved tests for this visit
        const approvedTests = visit.tests
          .map((testId: number) => visitTests.find(vt => vt.id === testId && vt.status === 'APPROVED'))
          .filter(Boolean) as VisitTest[];

        // Get unique approver usernames
        const approverUsernames = [...new Set(
          approvedTests
            .map(test => test.approvedBy)
            .filter(Boolean)
        )] as string[];

        if (approverUsernames.length === 0) {
          // Fallback to default approvers if no specific approvers found
          const response = await fetch(`${API_BASE_URL}/approvers`);
          const data = await response.json();
          if (isMounted) {
            setApprovers(data.filter((a: Approver) => a.show_on_print));
          }
          return;
        }

        // Fetch user details for each approver
        const authToken = localStorage.getItem('authToken');
        const approverPromises = approverUsernames.map(async (username) => {
          const response = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          const users = await response.json();
          const user = users.find((u: any) => u.username === username);

          if (user) {
            return {
              id: user.id,
              name: user.username,
              title: user.role,
              signature_image_url: user.signature_image_url,
              show_on_print: true
            };
          }
          return null;
        });

        const fetchedApprovers = (await Promise.all(approverPromises)).filter(Boolean) as Approver[];
        if (isMounted) {
          setApprovers(fetchedApprovers);
        }
      } catch (err) {
        console.error('Error fetching approvers:', err);
        // Fallback to default approvers on error
        try {
          const response = await fetch(`${API_BASE_URL}/approvers`);
          const data = await response.json();
          if (isMounted) {
            setApprovers(data.filter((a: Approver) => a.show_on_print));
          }
        } catch (fallbackErr) {
          console.error('Error fetching fallback approvers:', fallbackErr);
        }
      }
    };

    fetchActualApprovers();

    return () => {
      isMounted = false;
    };
  }, [visit.id]); // Only re-run when visit changes, not on every visitTests update

  if (!visit) {
    return <div className="bg-white p-8 max-w-4xl mx-auto text-red-500">Error: Visit data not found.</div>;
  }

  const approvedTestsForVisit = visit.tests
    .map((testId: number) => visitTests.find(vt => vt.id === testId && vt.status === 'APPROVED'))
    .filter(Boolean) as VisitTest[];

  if (approvedTestsForVisit.length === 0) {
    return <div className="bg-white p-8 max-w-4xl mx-auto text-yellow-600">Report not ready. No approved tests found for this visit.</div>;
  }

  const firstTest = approvedTestsForVisit[0];

  // Get referred doctor name (don't add "Dr." prefix as it's already in the name)
  const doctorName = visit.referred_doctor_name
    ? visit.referred_doctor_designation
      ? `${visit.referred_doctor_name}, ${visit.referred_doctor_designation}`
      : visit.referred_doctor_name
    : visit.other_ref_doctor || 'N/A';

  // Group tests by category
  const testsByCategory = approvedTestsForVisit.reduce((acc, test) => {
    const category = test.template.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(test);
    return acc;
  }, {} as Record<string, VisitTest[]>);

  // Create paginated report
  const reportPages = createReportPages(testsByCategory);
  const totalPages = reportPages.length;

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
        }

        #test-report {
          box-shadow: none !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 20mm 0 20mm !important;
          min-height: 100vh !important;
          height: auto !important;
          display: flex !important;
          flex-direction: column !important;
          background: white !important;
        }

        .report-content {
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
        }

        .report-footer {
          margin-top: auto !important;
          padding-bottom: 20px !important;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #test-report {
            padding: 0 20mm 0 20mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            page-break-after: always;
          }
          .report-footer {
            padding-bottom: 15mm !important;
          }
        }

        .top-space {
          height: 1.5in;
        }

        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 4px;
        }

        td, th {
          border: 1px solid #000;
          padding: 6px 8px;
          text-align: left;
          font-size: 11px;
          line-height: 1.5;
          vertical-align: middle;
        }

        th {
          background-color: #e5e5e5;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 10px;
          padding: 8px;
        }

        .section-title {
          background-color: #e5e5e5;
          border: 1px solid #000;
          padding: 8px 10px;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          margin-bottom: 0;
          font-size: 11px;
        }

        .test-group-row {
          font-weight: bold;
          background-color: #f9f9f9;
        }

        .report-page {
          position: relative;
        }

        @media print {
          .report-page {
            page-break-after: always;
            height: 297mm;
            min-height: 297mm;
          }

          .report-page:last-child {
            page-break-after: auto;
          }
        }
      `}</style>

      {/* Render each page */}
      {reportPages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          id={pageIndex === 0 ? "test-report" : `test-report-page-${pageIndex + 1}`}
          className="bg-white max-w-4xl mx-auto report-page"
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11px',
            lineHeight: '1.3',
            color: '#000',
            background: '#fff',
            pageBreakAfter: pageIndex < reportPages.length - 1 ? 'always' : 'auto',
            minHeight: '297mm'
          }}
        >
          {/* Top white space for pre-printed letterhead */}
          <div className="top-space"></div>

          <div className="report-content" style={{ minHeight: 'calc(297mm - 1.5in - 120mm)' }}>
          {/* Patient Details Block - SYMMETRIC LAYOUT */}
          <div style={{
            marginBottom: '10px',
            border: '1px solid #000'
          }}>
            {/* Top Row - Patient Info and Barcode */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #000'
            }}>
              {/* Left: Patient Details */}
              <div style={{
                flex: '1',
                borderRight: '1px solid #000',
                padding: '8px 12px',
                fontSize: '11px',
                lineHeight: '1.6'
              }}>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', display: 'inline-block', width: '130px' }}>Patient Name</span>
                  <span>: {visit.patient.name}</span>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', display: 'inline-block', width: '130px' }}>Age / Gender</span>
                  <span>: {formatAge(visit.patient)} / {visit.patient.sex}</span>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', display: 'inline-block', width: '130px' }}>Sample Type</span>
                  <span>: {sampleTypes || 'N/A'}</span>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', display: 'inline-block', width: '130px' }}>Client Name</span>
                  <span>: {visit.b2bClient?.name || visit.other_ref_customer || 'Walk-in'}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 'bold', display: 'inline-block', width: '130px' }}>Referred By</span>
                  <span>: {doctorName}</span>
                </div>
              </div>

              {/* Right: Barcode - COMPACT */}
              <div style={{
                width: '140px',
                padding: '8px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BarcodeComponent value={visit.visit_code} />
              </div>
            </div>

            {/* Bottom Row - Dates and Lab Tech */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              fontSize: '10px',
              lineHeight: '1.5'
            }}>
              <div style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Visit Id</div>
                <div>{visit.visit_code}</div>
              </div>
              <div style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Sample Drawn</div>
                <div>{formatDate(sampleDrawnDate)}</div>
              </div>
              <div style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Registration</div>
                <div>{formatDate(visit.registration_datetime)}</div>
              </div>
              <div style={{ padding: '6px 12px', borderRight: '1px solid #000' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Lab Tech</div>
                <div>{firstTest.enteredBy || 'N/A'}</div>
              </div>
              <div style={{ padding: '6px 12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Reported</div>
                <div>{formatDate(firstTest.approvedAt)}</div>
              </div>
            </div>
          </div>

          {/* Section Blocks - Tests by Department for this page */}
          {page.groups.map((group, groupIndex) => {
            // Check if this group contains only microbiology tests
            const hasOnlyMicrobiologyTests = group.tests.every(test => test.cultureResult);

            return (
              <div key={`${pageIndex}-${groupIndex}`} style={{ marginBottom: '8px' }}>
                {/* Section Title */}
                <div className="section-title">{group.department}</div>

                {/* Test Results Table */}
                <table>
                  {/* Only show headers for non-microbiology tests */}
                  {!hasOnlyMicrobiologyTests && (
                    <thead>
                      <tr>
                        <th style={{ width: '40%' }}>Test Description</th>
                        <th style={{ width: '15%', textAlign: 'center' }}>Result</th>
                        <th style={{ width: '15%', textAlign: 'center' }}>Units</th>
                        <th style={{ width: '30%' }}>Biological Reference Range</th>
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {group.tests.map((test) => (
                      <React.Fragment key={test.id}>
                        {/* Check if this is a microbiology test with culture results */}
                        {test.cultureResult ? (
                          /* For microbiology tests, show C&S report directly without table structure */
                          <tr>
                            <td colSpan={1} style={{ padding: 0, border: 'none' }}>
                              <MicrobiologyReportDisplay test={test} visit={visit} />
                            </td>
                          </tr>
                        ) : (
                          <>
                            {/* Test Group Row - only for non-microbiology tests */}
                            <tr className="test-group-row">
                              <td colSpan={4}>{test.template.name}</td>
                            </tr>
                            {/* Parameter Rows for regular tests */}
                            {test.template.parameters?.fields && test.template.parameters.fields.length > 0 ? (
                              test.template.parameters.fields.map((param: any) => (
                                <tr key={param.name}>
                                  <td>{param.name}</td>
                                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                    {String(test.results?.[param.name] ?? '-')}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>{param.unit ?? ''}</td>
                                  <td>{param.reference_range ?? ''}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} style={{ textAlign: 'center' }}>No parameters</td>
                              </tr>
                            )}
                          </>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* End of Report - Only on last page */}
          {pageIndex === reportPages.length - 1 && (
            <div style={{
              textAlign: 'center',
              fontWeight: 'bold',
              margin: '10px 0',
              padding: '6px 0',
              fontSize: '10px'
            }}>
              ** End of Report **
            </div>
          )}
        </div>

        {/* Footer Section - COMPACT & ALWAYS AT BOTTOM */}
        <div className="report-footer" style={{
          marginTop: 'auto',
          borderTop: '1px solid #000',
          paddingTop: '8px',
          fontSize: '8px'
        }}>
          {/* Signatories - COMPACT with real approver data */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '6px',
            minHeight: '35px'
          }}>
            {approvers.length > 0 ? (
              <>
                {/* Dynamic Approvers */}
                {approvers.map((approver: Approver, index: number) => (
                  <div key={approver.id} style={{ textAlign: index === 0 ? 'left' : index === approvers.length - 1 ? 'right' : 'center', flex: 1 }}>
                    {/* Show signature image if present, otherwise show signature line */}
                    {approver.signature_image_url ? (
                      <img
                        src={`${IMAGE_BASE_URL}${approver.signature_image_url}`}
                        alt="Signature"
                        style={{ maxWidth: '80px', maxHeight: '25px', marginBottom: '2px', display: 'block', margin: index === 0 ? '0 0 2px 0' : index === approvers.length - 1 ? '0 0 2px auto' : '0 auto 2px' }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          console.error('Failed to load signature image:', approver.signature_image_url);
                          console.error('Full URL:', `${IMAGE_BASE_URL}${approver.signature_image_url}`);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '80px',
                        height: '20px',
                        borderBottom: '1px solid #000',
                        marginBottom: '2px',
                        margin: index === 0 ? '0 0 2px 0' : index === approvers.length - 1 ? '0 0 2px auto' : '0 auto 2px'
                      }}></div>
                    )}
                    <div style={{ fontWeight: 'bold', fontSize: '8px', marginBottom: '1px' }}>
                      {approver.name}
                    </div>
                    <div style={{ fontSize: '7px', color: '#555' }}>
                      {approver.title}
                    </div>
                  </div>
                ))}

                {/* QR Code - ALWAYS SHOW - positioned based on approver count */}
                {visit.qr_code && (
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ width: '40px', height: '40px', margin: '0 auto' }}>
                      <img
                        src={visit.qr_code}
                        alt="QR Code"
                        style={{ width: '100%', height: '100%', display: 'block' }}
                      />
                    </div>
                    <div style={{ fontSize: '6px', color: '#555', marginTop: '2px' }}>
                      Scan to verify
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Fallback: Show default signatory and QR code */}
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{
                    width: '80px',
                    height: '20px',
                    borderBottom: '1px solid #000',
                    marginBottom: '2px'
                  }}></div>
                  <div style={{ fontWeight: 'bold', fontSize: '8px', marginBottom: '1px' }}>
                    Lab Director
                  </div>
                  <div style={{ fontSize: '7px', color: '#555' }}>
                    Pathologist
                  </div>
                </div>

                {/* QR Code - Center */}
                {visit.qr_code && (
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ width: '40px', height: '40px', margin: '0 auto' }}>
                      <img
                        src={visit.qr_code}
                        alt="QR Code"
                        style={{ width: '100%', height: '100%', display: 'block' }}
                      />
                    </div>
                    <div style={{ fontSize: '6px', color: '#555', marginTop: '2px' }}>
                      Scan to verify
                    </div>
                  </div>
                )}

                {/* Empty space for balance */}
                <div style={{ flex: 1 }}></div>
              </>
            )}
          </div>

          {/* Footer Notes - ALL DISCLAIMERS */}
          <div style={{
            fontSize: '8px',
            lineHeight: '1.4',
            color: '#333',
            marginTop: '6px',
            paddingTop: '6px',
            borderTop: '1px solid #000'
          }}>
            <p style={{ margin: '2px 0' }}>
              Assay result should be correlated clinically with other laboratory finding and the total clinical status of the patient.
            </p>
            <p style={{ margin: '2px 0' }}>
              Note :- This Report is subject to the terms and conditions mentioned overleaf
            </p>
            <p style={{ margin: '2px 0', fontWeight: 'bold' }}>
              Note :- PARTIAL REPRODUCTION OF THIS REPORT IS NOT PERMITTED
            </p>
          </div>

          {/* Page Number */}
          <div style={{
            textAlign: 'center',
            fontSize: '8px',
            marginTop: '4px',
            color: '#333'
          }}>
            Page {pageIndex + 1} of {totalPages}
          </div>
        </div>
      </div>
      ))}
    </>
  );
};
