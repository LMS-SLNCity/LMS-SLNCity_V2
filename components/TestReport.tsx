// // import React, { useEffect, useRef } from 'react';
// // import { VisitTest, Visit, Signatory } from '../types';
// // import { useAppContext } from '../context/AppContext';
// // import { QRCodeSVG } from 'qrcode.react';

// // // Barcode component
// // const BarcodeComponent: React.FC<{ value: string }> = ({ value }) => {
// //   const barcodeRef = useRef<SVGSVGElement>(null);

// //   useEffect(() => {
// //     if (barcodeRef.current && typeof window !== 'undefined') {
// //       try {
// //         import('jsbarcode').then((JsBarcode) => {
// //           if (barcodeRef.current) {
// //             JsBarcode.default(barcodeRef.current, value, {
// //               format: 'CODE128',
// //               width: 1.5,
// //               height: 40,
// //               displayValue: false,
// //             });
// //           }
// //         });
// //       } catch (error) {
// //         console.error('Error generating barcode:', error);
// //       }
// //     }
// //   }, [value]);

// //   return <svg ref={barcodeRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }}></svg>;
// // };

// // interface TestReportProps {
// //   visit: Visit;
// //   signatory: Signatory;
// //   canEdit: boolean;
// //   onEdit: (test: VisitTest) => void;
// // }

// // const formatAge = (p: Visit['patient']) => {
// //   if (p.age_years > 0) return `${p.age_years} Year(s)`;
// //   if (p.age_months > 0) return `${p.age_months} Month(s)`;
// //   if (p.age_days > 0) return `${p.age_days} Day(s)`;
// //   return 'N/A';
// // };

// // const formatDate = (dateString?: string) => {
// //   if (!dateString) return 'N/A';
// //   return new Date(dateString).toLocaleString('en-GB', {
// //     year: 'numeric',
// //     month: '2-digit',
// //     day: '2-digit',
// //     hour: '2-digit',
// //     minute: '2-digit'
// //   }).replace(',', '');
// // };

// // export const TestReport: React.FC<TestReportProps> = ({ visit, signatory, canEdit, onEdit }) => {
// //   const { visitTests } = useAppContext();

// //   const approvedTestsForVisit = visit.tests
// //     .map(testId => visitTests.find(vt => vt.id === testId && vt.status === 'APPROVED'))
// //     .filter(Boolean) as VisitTest[];

// //   if (!visit) {
// //     return <div className="bg-white p-8 max-w-4xl mx-auto text-red-500">Error: Visit data not found.</div>;
// //   }
// //   if (approvedTestsForVisit.length === 0) {
// //     return <div className="bg-white p-8 max-w-4xl mx-auto text-yellow-600">Report not ready. No approved tests found for this visit.</div>;
// //   }

// //   const firstTest = approvedTestsForVisit[0];
// //   const doctorName = visit.referred_doctor_id ? `Dr. ID: ${visit.referred_doctor_id}` : visit.other_ref_doctor || 'N/A';

// //   const testsByCategory = approvedTestsForVisit.reduce((acc, test) => {
// //     const category = test.template.category || 'Uncategorized';
// //     if (!acc[category]) {
// //       acc[category] = [];
// //     }
// //     acc[category].push(test);
// //     return acc;
// //   }, {} as Record<string, VisitTest[]>);

// //   return (
// //     <>
// //       <style>{`
// //         @media print {
// //           body {
// //             -webkit-print-color-adjust: exact;
// //             print-color-adjust: exact;
// //             margin: 0;
// //             padding: 0;
// //           }
// //           #test-report {
// //             box-shadow: none !important;
// //             max-width: 100% !important;
// //             margin: 0 !important;
// //             padding: 0.4in !important;
// //           }
// //           .screen-footer {
// //             display: none !important;
// //           }
// //         }
// //         table {
// //           border-collapse: collapse;
// //           width: 100%;
// //         }
// //         td, th {
// //           border: 1px solid #000;
// //           padding: 4px 6px;
// //           text-align: left;
// //         }
// //         th {
// //           background-color: #e5e5e5;
// //           font-weight: bold;
// //         }
// //       `}</style>

// //       <div id="test-report" className="bg-white max-w-4xl mx-auto" style={{ padding: '0.4in', fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>

// //         {/* PATIENT INFORMATION - 2 Column Layout */}
// //         <div className="flex justify-between mb-6 gap-8">
// //           {/* LEFT COLUMN - Patient Details */}
// //           <div className="flex-1 text-xs space-y-1">
// //             <div className="flex">
// //               <span className="font-bold">Patient Name</span>
// //               <span className="ml-1">: {visit.patient.name}</span>
// //             </div>
// //             <div className="flex">
// //               <span className="font-bold">Age / Gender</span>
// //               <span className="ml-1">: {formatAge(visit.patient)} / {visit.patient.sex}</span>
// //             </div>
// //             <div className="flex">
// //               <span className="font-bold">Sample Type</span>
// //               <span className="ml-1">: {visit.sample_type || 'N/A'}</span>
// //             </div>
// //             <div className="flex">
// //               <span className="font-bold">Client Code</span>
// //               <span className="ml-1">: {visit.ref_customer_id || 'N/A'}</span>
// //             </div>
// //             <div className="flex">
// //               <span className="font-bold">Referred By</span>
// //               <span className="ml-1">: {doctorName}</span>
// //             </div>
// //           </div>

// //           {/* RIGHT COLUMN - Barcode + Patient ID + Dates */}
// //           <div className="flex flex-col items-end text-xs space-y-2">
// //             {/* Barcode */}
// //             <div className="w-40">
// //               <BarcodeComponent value={visit.visit_code} />
// //             </div>

// //             {/* Patient ID and Dates */}
// //             <div className="text-right space-y-0.5 text-xs">
// //               <div>
// //                 <span className="font-bold">Patient Id</span>
// //                 <span className="ml-2">{visit.visit_code}</span>
// //               </div>
// //               <div>
// //                 <span className="font-bold">Sample Drawn Date</span>
// //                 <span className="ml-2">{formatDate(visit.sample_drawn_datetime)}</span>
// //               </div>
// //               <div>
// //                 <span className="font-bold">Registration Date</span>
// //                 <span className="ml-2">{formatDate(visit.registration_datetime)}</span>
// //               </div>
// //               <div>
// //                 <span className="font-bold">Reported Date</span>
// //                 <span className="ml-2">{formatDate(firstTest.approvedAt)}</span>
// //               </div>
// //             </div>
// //           </div>
// //         </div>

// //         {/* TEST RESULTS SECTION */}
// //         <div className="mt-6">
// //           {Object.entries(testsByCategory).map(([category, tests]) => (
// //             <div key={category} className="mb-4">
// //               {/* Category Header - Gray Background */}
// //               <div className="bg-gray-300 border border-black py-1 px-2 mb-2">
// //                 <h3 className="font-bold text-sm text-black uppercase">{category}</h3>
// //               </div>

// //               {/* Results Table */}
// //               <table className="w-full text-xs border border-black mb-4">
// //                 <thead>
// //                   <tr className="bg-gray-300">
// //                     <th className="border border-black px-3 py-2 text-left">TEST DESCRIPTION</th>
// //                     <th className="border border-black px-3 py-2 text-center w-20">RESULT</th>
// //                     <th className="border border-black px-3 py-2 text-center w-20">UNITS</th>
// //                     <th className="border border-black px-3 py-2 text-left">BIOLOGICAL REFERENCE RANGE</th>
// //                   </tr>
// //                 </thead>
// //                 <tbody>
// //                   {tests.map(test => (
// //                     <React.Fragment key={test.id}>
// //                       {/* Test Name Row - Bold */}
// //                       <tr>
// //                         <td colSpan={4} className="border border-black px-3 py-1 font-bold bg-white">
// //                           {test.template.name}
// //                         </td>
// //                       </tr>
// //                       {/* Parameter Rows */}
// //                       {test.template.parameters?.fields && test.template.parameters.fields.length > 0 ? (
// //                         test.template.parameters.fields.map(param => (
// //                           <tr key={param.name}>
// //                             <td className="border border-black px-3 py-1">{param.name}</td>
// //                             <td className="border border-black px-3 py-1 font-bold text-center">{String(test.results?.[param.name] ?? '-')}</td>
// //                             <td className="border border-black px-3 py-1 text-center">{param.unit || ''}</td>
// //                             <td className="border border-black px-3 py-1">{param.reference_range || ''}</td>
// //                           </tr>
// //                         ))
// //                       ) : (
// //                         <tr>
// //                           <td colSpan={4} className="border border-black px-3 py-1 text-center">No parameters</td>
// //                         </tr>
// //                       )}
// //                     </React.Fragment>
// //                   ))}
// //                 </tbody>
// //               </table>
// //             </div>
// //           ))}
// //         </div>

// //         {/* END OF REPORT */}
// //         <div className="text-center font-bold text-xs mt-4 py-2">
// //           ** End of Report **
// //         </div>

// //         {/* FOOTER - Print View */}
// //         <div className="hidden print:block mt-6 pt-4 border-t-2 border-black">
// //           {/* Signature Section - 3 Columns */}
// //           <div className="grid grid-cols-3 gap-8 text-center mt-4 mb-4">
// //             {/* Left - Signature Line */}
// //             <div>
// //               <div className="h-8 border-b-2 border-black mb-1"></div>
// //               <p className="font-bold text-xs">DR MISBHA LATEEFA, MD</p>
// //               <p className="text-xs text-gray-700">Consultant Pathologist</p>
// //             </div>

// //             {/* Center - QR Code */}
// //             <div className="flex flex-col items-center">
// //               <div className="bg-white p-1 border border-gray-300 rounded mb-2">
// //                 <QRCodeSVG
// //                   value={`${window.location.origin}/verify-report/${visit.visit_code}`}
// //                   size={50}
// //                   level="H"
// //                   includeMargin={false}
// //                 />
// //               </div>
// //               <p className="text-xs text-gray-700">{visit.visit_code}</p>
// //             </div>

// //             {/* Right - Signatory */}
// //             <div>
// //               <div className="h-8 border-b-2 border-black mb-1"></div>
// //               <p className="font-bold text-xs">T.V. SUBBARAO</p>
// //               <p className="text-xs text-gray-700">M.Sc., Bio-Chemist</p>
// //             </div>
// //           </div>

// //           {/* Disclaimer & Notes */}
// //           <div className="text-xs text-gray-700 mt-3 pt-2 border-t border-black space-y-1">
// //             <p>Assay result should be correlated clinically with other laboratory finding and the total clinical status of the patient.</p>
// //             <p>Note :- This Report is subject to the terms and conditions mentioned overleaf</p>
// //             <p>Note :- PARTIAL REPRODUCTION OF THIS REPORT IS NOT PERMITTED</p>
// //           </div>

// //           {/* Page Number */}
// //           <div className="text-center text-xs mt-3 pt-2 border-t border-black">
// //             <p>Page 1 of 1</p>
// //           </div>
// //         </div>

// //         {/* FOOTER - Screen View */}
// //         <div className="screen-footer mt-6 pt-4 border-t-2 border-black">
// //           <div className="grid grid-cols-3 gap-6 mt-4">
// //             {/* Left - Signature */}
// //             <div className="flex flex-col items-center">
// //               <div className="border-b border-black w-32 mb-2"></div>
// //               <p className="font-bold text-xs">{signatory.name}</p>
// //               <p className="text-xs text-gray-600">{signatory.title}</p>
// //             </div>

// //             {/* Center - QR Code */}
// //             <div className="flex flex-col items-center">
// //               <div className="bg-white p-1 border border-gray-300 rounded mb-2">
// //                 <QRCodeSVG
// //                   value={`${window.location.origin}/verify-report/${visit.visit_code}`}
// //                   size={60}
// //                   level="H"
// //                   includeMargin={true}
// //                 />
// //               </div>
// //               <p className="text-xs text-gray-700">{visit.visit_code}</p>
// //             </div>

// //             {/* Right - Notes */}
// //             <div className="text-xs text-gray-700 space-y-1 flex flex-col justify-center">
// //               <p>Assay result should be correlated clinically with other laboratory finding and the total clinical status of the patient.</p>
// //               <p>Note :- This Report is subject to the terms and conditions mentioned overleaf</p>
// //               <p>Note :- PARTIAL REPRODUCTION OF THIS REPORT IS NOT PERMITTED</p>
// //             </div>
// //           </div>
// //         </div>
// //       </div>
// //     </>
// //   );
// // };

// import React, { useEffect, useRef, useState } from 'react';
// import { VisitTest, Visit, Signatory, Approver } from '../types';
// import { useAppContext } from '../context/AppContext';
// import { API_BASE_URL } from '../config/api';
// import { MicrobiologyReportDisplay } from './MicrobiologyReportDisplay';

// // Barcode component using jsbarcode - SMALLER SIZE
// const BarcodeComponent: React.FC<{ value: string }> = ({ value }) => {
//   const barcodeRef = useRef<SVGSVGElement>(null);

//   useEffect(() => {
//     if (barcodeRef.current && typeof window !== 'undefined') {
//       try {
//         import('jsbarcode').then((JsBarcode) => {
//           if (barcodeRef.current) {
//             JsBarcode.default(barcodeRef.current, value, {
//               format: 'CODE128',
//               width: 1,
//               height: 25,
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

// // Helper functions
// const formatAge = (p: Visit['patient']) => {
//   if (p.age_years > 0) return `${p.age_years} Year(s)`;
//   if (p.age_months > 0) return `${p.age_months} Month(s)`;
//   if (p.age_days > 0) return `${p.age_days} Day(s)`;
//   return 'N/A';
// };

// const formatDate = (dateString?: string) => {
//   if (!dateString) return 'N/A';

//   // Parse the date string and format it consistently
//   // The database returns timestamps in UTC, so we need to handle them properly
//   const date = new Date(dateString);

//   // Format: DD/MM/YYYY HH:MM
//   const day = String(date.getDate()).padStart(2, '0');
//   const month = String(date.getMonth() + 1).padStart(2, '0');
//   const year = date.getFullYear();
//   const hours = String(date.getHours()).padStart(2, '0');
//   const minutes = String(date.getMinutes()).padStart(2, '0');

//   return `${day}/${month}/${year} ${hours}:${minutes}`;
// };

// // Pagination types and logic
// interface PageGroup {
//   department: string;
//   tests: VisitTest[];
//   parameterCount: number;
// }

// interface ReportPage {
//   pageNumber: number;
//   groups: PageGroup[];
//   totalParameters: number;
// }

// // Calculate how many parameters a test has
// const getTestParameterCount = (test: VisitTest): number => {
//   return test.template.parameters?.fields?.length || 0;
// };

// // Check if a test is a Culture & Sensitivity test
// const isCultureTest = (test: VisitTest): boolean => {
//   return !!test.cultureResult;
// };

// // SIMPLE PAGINATION LOGIC:
// // - Each test is a complete block
// // - If test fits on current page → add it
// // - If test doesn't fit → move to new page
// // - NEVER split a test across pages
// // - ALWAYS include ALL tests
// // - Culture & Sensitivity tests ALWAYS start on a new page

// const MAX_PARAMETERS_PER_PAGE = 18; // Conservative - ensures proper spacing and no footer bleeding

// const createReportPages = (testsByCategory: Record<string, VisitTest[]>): ReportPage[] => {
//   const pages: ReportPage[] = [];
//   let currentPage: ReportPage = { pageNumber: 1, groups: [], totalParameters: 0 };

//   console.log('🔄 Starting pagination...');
//   console.log('📊 Tests by category:', Object.entries(testsByCategory).map(([cat, tests]) =>
//     `${cat}: ${tests.length} tests`
//   ).join(', '));

//   // Process each department and each test
//   Object.entries(testsByCategory).forEach(([department, tests]) => {
//     console.log(`\n📁 Processing department: ${department} (${tests.length} tests)`);

//     tests.forEach((test, testIndex) => {
//       const paramCount = getTestParameterCount(test);
//       const isCulture = isCultureTest(test);
//       console.log(`  📝 Test ${testIndex + 1}: "${test.template.name}" - ${paramCount} parameters${isCulture ? ' [CULTURE TEST]' : ''}`);

//       // RULE: Culture & Sensitivity tests ALWAYS start on a new page
//       if (isCulture && currentPage.groups.length > 0) {
//         console.log(`    🧫 Culture test detected - forcing new page`);
//         console.log(`    📄 Saving current page with ${currentPage.groups.length} groups, ${currentPage.totalParameters} parameters`);

//         // Save current page and start new one
//         pages.push(currentPage);
//         currentPage = { pageNumber: pages.length + 1, groups: [], totalParameters: 0 };

//         console.log(`    ✅ Started new page ${currentPage.pageNumber} for Culture test`);
//       }

//       // Check if this test fits on the current page (only for non-culture tests)
//       const wouldExceedPageLimit = currentPage.totalParameters + paramCount > MAX_PARAMETERS_PER_PAGE;
//       const isPageEmpty = currentPage.groups.length === 0;

//       // Decision: Move to new page if:
//       // 1. Adding this test would exceed page limit
//       // 2. AND the page is not empty (don't create empty pages)
//       // 3. AND it's not a culture test (culture tests already handled above)
//       if (wouldExceedPageLimit && !isPageEmpty && !isCulture) {
//         console.log(`    ⚠️ Test doesn't fit (current: ${currentPage.totalParameters}, would be: ${currentPage.totalParameters + paramCount})`);
//         console.log(`    📄 Creating new page. Current page has ${currentPage.groups.length} groups, ${currentPage.totalParameters} parameters`);

//         // Save current page and start new one
//         pages.push(currentPage);
//         currentPage = { pageNumber: pages.length + 1, groups: [], totalParameters: 0 };

//         console.log(`    ✅ Started page ${currentPage.pageNumber}`);
//       }

//       // Add test to current page
//       // Check if we already have a group for this department on this page
//       const existingGroup = currentPage.groups.find(g => g.department === department);

//       if (existingGroup) {
//         // Add to existing department group
//         existingGroup.tests.push(test);
//         existingGroup.parameterCount += paramCount;
//         console.log(`    ➕ Added to existing ${department} group on page ${currentPage.pageNumber}`);
//       } else {
//         // Create new department group
//         currentPage.groups.push({
//           department,
//           tests: [test],
//           parameterCount: paramCount
//         });
//         console.log(`    ➕ Created new ${department} group on page ${currentPage.pageNumber}`);
//       }

//       currentPage.totalParameters += paramCount;
//       console.log(`    📊 Page ${currentPage.pageNumber} now has ${currentPage.totalParameters} parameters`);
//     });
//   });

//   // Don't forget the last page!
//   if (currentPage.groups.length > 0) {
//     console.log(`\n📄 Adding final page ${currentPage.pageNumber} with ${currentPage.totalParameters} parameters`);
//     pages.push(currentPage);
//   }

//   // Verification: Count all tests
//   const totalTestsInPages = pages.reduce((sum, page) =>
//     sum + page.groups.reduce((groupSum, group) => groupSum + group.tests.length, 0), 0
//   );
//   const totalTestsOriginal = Object.values(testsByCategory).reduce((sum, tests) => sum + tests.length, 0);

//   console.log('\n✅ PAGINATION COMPLETE');
//   console.log(`📊 Total pages: ${pages.length}`);
//   console.log(`📝 Total tests in pages: ${totalTestsInPages}`);
//   console.log(`📝 Total tests original: ${totalTestsOriginal}`);

//   if (totalTestsInPages !== totalTestsOriginal) {
//     console.error(`❌ ERROR: Test count mismatch! Expected ${totalTestsOriginal}, got ${totalTestsInPages}`);
//   } else {
//     console.log('✅ All tests accounted for!');
//   }

//   // Detailed page breakdown
//   pages.forEach((page, idx) => {
//     const testCount = page.groups.reduce((sum, g) => sum + g.tests.length, 0);
//     console.log(`  Page ${idx + 1}: ${testCount} tests, ${page.totalParameters} parameters`);
//     page.groups.forEach(group => {
//       console.log(`    - ${group.department}: ${group.tests.length} tests (${group.tests.map(t => t.template.name).join(', ')})`);
//     });
//   });

//   return pages;
// };

// interface TestReportProps {
//   visit: Visit;
//   signatory: Signatory;
//   canEdit: boolean;
//   onEdit: (test: VisitTest) => void;
// }

// export const TestReport: React.FC<TestReportProps> = ({ visit, signatory }) => {
//   const { visitTests } = useAppContext();
//   const [approvers, setApprovers] = useState<Approver[]>([]);

//   // Get all tests for this visit
//   const testsForVisit = visitTests.filter(t => visit.tests.includes(t.id));

//   // Get the earliest collection date from all tests (phlebotomy collection time)
//   const sampleDrawnDate = testsForVisit
//     .map(t => t.collectedAt)
//     .filter(date => date)
//     .sort()[0];

//   // Get the earliest approval date from all tests (reported time)
//   const reportedDate = testsForVisit
//     .map(t => t.approvedAt)
//     .filter(date => date)
//     .sort()[0];

//   // Get unique specimen types from all tests (comma-separated if multiple)
//   const specimenTypes = [...new Set(testsForVisit.map(t => t.specimen_type).filter(Boolean))].join(', ');

//   // Get base URL for images (remove /api suffix)
//   const IMAGE_BASE_URL = API_BASE_URL.replace('/api', '');

//   // Fetch actual approvers who approved tests for this visit - OPTIMIZED to run only once
//   useEffect(() => {
//     let isMounted = true;

//     const fetchActualApprovers = async () => {
//       try {
//         // Get all approved or printed tests for this visit (to support reprinting)
//         const approvedTests = visit.tests
//           .map((testId: number) => visitTests.find(vt => vt.id === testId && (vt.status === 'APPROVED' || vt.status === 'PRINTED')))
//           .filter(Boolean) as VisitTest[];

//         // Get unique approver usernames
//         const approverUsernames = [...new Set(
//           approvedTests
//             .map(test => test.approvedBy)
//             .filter(Boolean)
//         )] as string[];

//         if (approverUsernames.length === 0) {
//           // Fallback to default approvers if no specific approvers found
//           const response = await fetch(`${API_BASE_URL}/approvers`);
//           const data = await response.json();
//           if (isMounted) {
//             setApprovers(data.filter((a: Approver) => a.show_on_print));
//           }
//           return;
//         }

//         // Fetch user details for each approver
//         const authToken = sessionStorage.getItem('authToken');
//         const approverPromises = approverUsernames.map(async (username) => {
//           const response = await fetch(`${API_BASE_URL}/users`, {
//             headers: { 'Authorization': `Bearer ${authToken}` }
//           });
//           const users = await response.json();
//           const user = users.find((u: any) => u.username === username);

//           if (user) {
//             return {
//               id: user.id,
//               name: user.username,
//               title: user.role,
//               signature_image_url: user.signature_image_url,
//               show_on_print: true
//             };
//           }
//           return null;
//         });

//         const fetchedApprovers = (await Promise.all(approverPromises)).filter(Boolean) as Approver[];
//         if (isMounted) {
//           setApprovers(fetchedApprovers);
//         }
//       } catch (err) {
//         console.error('Error fetching approvers:', err);
//         // Fallback to default approvers on error
//         try {
//           const response = await fetch(`${API_BASE_URL}/approvers`);
//           const data = await response.json();
//           if (isMounted) {
//             setApprovers(data.filter((a: Approver) => a.show_on_print));
//           }
//         } catch (fallbackErr) {
//           console.error('Error fetching fallback approvers:', fallbackErr);
//         }
//       }
//     };

//     fetchActualApprovers();

//     return () => {
//       isMounted = false;
//     };
//   }, [visit.id]); // Only re-run when visit changes, not on every visitTests update

//   if (!visit) {
//     return <div className="bg-white p-8 max-w-4xl mx-auto text-red-500">Error: Visit data not found.</div>;
//   }

//   // Allow both APPROVED and PRINTED tests for report generation (to support reprinting)
//   const approvedTestsForVisit = visit.tests
//     .map((testId: number) => visitTests.find(vt => vt.id === testId && (vt.status === 'APPROVED' || vt.status === 'PRINTED')))
//     .filter(Boolean) as VisitTest[];

//   if (approvedTestsForVisit.length === 0) {
//     return <div className="bg-white p-8 max-w-4xl mx-auto text-yellow-600">Report not ready. No approved or printed tests found for this visit.</div>;
//   }

//   const firstTest = approvedTestsForVisit[0];

//   // Get referred doctor name (don't add "Dr." prefix as it's already in the name)
//   const doctorName = visit.referred_doctor_name
//     ? visit.referred_doctor_designation
//       ? `${visit.referred_doctor_name}, ${visit.referred_doctor_designation}`
//       : visit.referred_doctor_name
//     : visit.other_ref_doctor || 'N/A';

//   // Group tests by category
//   const testsByCategory = approvedTestsForVisit.reduce((acc, test) => {
//     const category = test.template.category || 'Uncategorized';
//     if (!acc[category]) {
//       acc[category] = [];
//     }
//     acc[category].push(test);
//     return acc;
//   }, {} as Record<string, VisitTest[]>);

//   // Create paginated report
//   const reportPages = createReportPages(testsByCategory);
//   const totalPages = reportPages.length;

//   // Debug: Log pagination info
//   console.log('📊 Report Pagination Info:');
//   console.log(`  Total approved tests: ${approvedTestsForVisit.length}`);
//   console.log(`  Tests by category:`, Object.entries(testsByCategory).map(([cat, tests]) => `${cat}: ${tests.length}`));
//   console.log(`  Total pages: ${totalPages}`);

//   // Log each test with its parameter count
//   approvedTestsForVisit.forEach((test, idx) => {
//     const paramCount = test.template.parameters?.fields?.length || 0;
//     console.log(`  Test ${idx + 1}: ${test.template.name} (${test.template.category}) - ${paramCount} parameters`);
//   });

//   // Log each page
//   reportPages.forEach((page, idx) => {
//     const testsOnPage = page.groups.reduce((sum, g) => sum + g.tests.length, 0);
//     console.log(`  Page ${idx + 1}: ${testsOnPage} tests, ${page.totalParameters} parameters`);
//     page.groups.forEach(group => {
//       console.log(`    - ${group.department}: ${group.tests.length} tests (${group.tests.map(t => t.template.name).join(', ')})`);
//     });
//   });

//   // Verify all tests are included
//   const totalTestsInPages = reportPages.reduce((sum, page) =>
//     sum + page.groups.reduce((gSum, g) => gSum + g.tests.length, 0), 0
//   );
//   if (totalTestsInPages !== approvedTestsForVisit.length) {
//     console.error(`⚠️ WARNING: ${approvedTestsForVisit.length - totalTestsInPages} tests are missing from the report!`);
//     console.error(`  Expected: ${approvedTestsForVisit.length}, Got: ${totalTestsInPages}`);

//     // Find which tests are missing
//     const testsInPages = new Set<number>();
//     reportPages.forEach(page => {
//       page.groups.forEach(group => {
//         group.tests.forEach(test => testsInPages.add(test.id));
//       });
//     });
//     const missingTests = approvedTestsForVisit.filter(test => !testsInPages.has(test.id));
//     console.error(`  Missing tests:`, missingTests.map(t => `${t.template.name} (${t.template.parameters?.fields?.length || 0} params)`));
//   } else {
//     console.log(`✅ All ${approvedTestsForVisit.length} tests are included in the report`);
//   }

//   return (
//     <>
//       <style>{`
//         @page {
//           size: A4;
//           margin: 0;
//         }

//         html, body {
//           height: 100%;
//           margin: 0;
//           padding: 0;
//         }

//         .report-page {
//           position: relative;
//           width: 210mm;
//           height: 297mm;
//           max-width: 210mm;
//           max-height: 297mm;
//           margin: 0 auto;
//           padding: 0 15mm 25mm 15mm;
//           background: white;
//           box-sizing: border-box;
//           display: flex;
//           flex-direction: column;
//           overflow: hidden;
//         }

//         .report-content {
//           flex: 1;
//           display: flex;
//           flex-direction: column;
//           overflow: hidden;
//         }

//         .report-footer {
//           margin-top: auto;
//           padding-top: 8px;
//           margin-bottom: 0;
//           flex-shrink: 0;
//         }

//         @media print {
//           @page {
//             margin: 0;
//           }

//           body {
//             -webkit-print-color-adjust: exact;
//             print-color-adjust: exact;
//             margin: 0 !important;
//             padding: 0 !important;
//           }

//           .report-page {
//             page-break-after: always;
//             width: 210mm;
//             height: 297mm;
//             min-height: 297mm;
//             max-height: 297mm;
//             max-width: 210mm;
//             margin: 0 !important;
//             padding: 0 15mm 25mm 15mm !important;
//             box-shadow: none;
//             overflow: hidden;
//           }

//           .report-page:last-child {
//             page-break-after: auto;
//           }

//           .report-footer {
//             flex-shrink: 0;
//             margin-bottom: 0;
//           }

//           .top-space {
//             height: 25mm !important;
//           }
//         }

//         .top-space {
//           height: 25mm;
//           flex-shrink: 0;
//         }

//         table {
//           border-collapse: collapse;
//           width: 100%;
//           margin-bottom: 2px;
//         }

//         td, th {
//           border: none;
//           padding: 6px 5px;
//           text-align: left;
//           font-size: 9px;
//           line-height: 1.4;
//           vertical-align: top;
//           color: #000;
//           font-weight: 500;
//         }

//         /* Remove extra margins from nested divs */
//         td > div {
//           margin-top: 1px !important;
//           margin-bottom: 0 !important;
//           line-height: 1.2;
//         }

//         /* Apply borders only where needed to avoid overlaps */
//         table {
//           border: 0.5px solid #666;
//         }

//         thead th {
//           border-bottom: 0.5px solid #666;
//         }

//         thead th:not(:last-child) {
//           border-right: 0.5px solid #666;
//         }

//         tbody td {
//           border-bottom: 0.5px solid #666;
//         }

//         tbody td:not(:last-child) {
//           border-right: 0.5px solid #666;
//         }

//         th {
//           background-color: #e5e5e5;
//           font-weight: bold;
//           text-transform: uppercase;
//           font-size: 8px;
//           padding: 6px 5px;
//           color: #000;
//           vertical-align: middle;
//         }

//         .section-title {
//           background-color: #e5e5e5;
//           border: 0.5px solid #666;
//           padding: 4px 6px;
//           font-weight: bold;
//           text-align: center;
//           text-transform: uppercase;
//           margin-bottom: 0;
//           font-size: 9px;
//           color: #000;
//         }

//         .test-group-row td {
//           font-weight: bold;
//           background-color: #f9f9f9;
//           color: #000;
//           vertical-align: middle !important;
//           padding: 4px 6px !important;
//         }

//         /* Heading rows should be centered */
//         tr[style*="backgroundColor: '#f3f4f6'"] td {
//           vertical-align: middle !important;
//         }
//       `}</style>

//       {/* Render each page */}
//       {reportPages.map((page, pageIndex) => (
//         <div
//           key={pageIndex}
//           id={pageIndex === 0 ? "test-report" : `test-report-page-${pageIndex + 1}`}
//           className="bg-white max-w-4xl mx-auto report-page"
//           style={{
//             fontFamily: 'Arial, Helvetica, sans-serif',
//             fontSize: '11px',
//             lineHeight: '1.3',
//             color: '#000',
//             background: '#fff',
//             pageBreakAfter: pageIndex < reportPages.length - 1 ? 'always' : 'auto',
//             minHeight: '297mm'
//           }}
//         >
//           {/* Top white space for pre-printed letterhead */}
//           <div className="top-space"></div>

//           <div className="report-content">
//           {/* Patient Details Block - COMPACT LAYOUT */}
//           <div style={{
//             marginBottom: '3px',
//             border: '0.5px solid #666',
//             flexShrink: 0
//           }}>
//             {/* Top Row - Patient Info and Barcode */}
//             <div style={{
//               display: 'flex',
//               borderBottom: '0.5px solid #666'
//             }}>
//               {/* Left: Patient Details */}
//               <div style={{
//                 flex: '1',
//                 borderRight: '0.5px solid #666',
//                 padding: '5px 8px',
//                 fontSize: '10px',
//                 lineHeight: '1.5',
//                 color: '#000',
//                 fontWeight: '500'
//               }}>
//                 <div style={{ marginBottom: '2px' }}>
//                   <span style={{ fontWeight: 'bold', display: 'inline-block', width: '110px', color: '#000' }}>Patient Name</span>
//                   <span style={{ color: '#000' }}>: {visit.patient.name}</span>
//                 </div>
//                 <div style={{ marginBottom: '2px' }}>
//                   <span style={{ fontWeight: 'bold', display: 'inline-block', width: '110px', color: '#000' }}>Age / Gender</span>
//                   <span style={{ color: '#000' }}>: {formatAge(visit.patient)} / {visit.patient.sex}</span>
//                 </div>
//                 <div style={{ marginBottom: '2px' }}>
//                   <span style={{ fontWeight: 'bold', display: 'inline-block', width: '110px', color: '#000' }}>Client Name</span>
//                   <span style={{ color: '#000' }}>: {visit.b2bClient?.name || visit.other_ref_customer || 'Walk-in'}</span>
//                 </div>
//                 <div>
//                   <span style={{ fontWeight: 'bold', display: 'inline-block', width: '110px', color: '#000' }}>Referred By</span>
//                   <span style={{ color: '#000' }}>: {doctorName}</span>
//                 </div>
//               </div>

//               {/* Right: Barcode - COMPACT */}
//               <div style={{
//                 width: '120px',
//                 padding: '5px',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center'
//               }}>
//                 <BarcodeComponent value={visit.visit_code} />
//               </div>
//             </div>

//             {/* Bottom Row - Dates */}
//             <div style={{
//               display: 'grid',
//               gridTemplateColumns: 'repeat(4, 1fr)',
//               fontSize: '9px',
//               lineHeight: '1.4',
//               color: '#000',
//               fontWeight: '500'
//             }}>
//               <div style={{ padding: '4px 8px', borderRight: '0.5px solid #666' }}>
//                 <div style={{ fontWeight: 'bold', marginBottom: '1px', color: '#000' }}>Visit Id</div>
//                 <div style={{ color: '#000' }}>{visit.visit_code}</div>
//               </div>
//               <div style={{ padding: '4px 8px', borderRight: '0.5px solid #666' }}>
//                 <div style={{ fontWeight: 'bold', marginBottom: '1px', color: '#000' }}>Sample Drawn</div>
//                 <div style={{ color: '#000' }}>{formatDate(sampleDrawnDate)}</div>
//               </div>
//               <div style={{ padding: '4px 8px', borderRight: '0.5px solid #666' }}>
//                 <div style={{ fontWeight: 'bold', marginBottom: '1px', color: '#000' }}>Registration</div>
//                 <div style={{ color: '#000' }}>{formatDate(visit.created_at)}</div>
//               </div>
//               <div style={{ padding: '4px 8px' }}>
//                 <div style={{ fontWeight: 'bold', marginBottom: '1px', color: '#000' }}>Reported</div>
//                 <div style={{ color: '#000' }}>{formatDate(reportedDate)}</div>
//               </div>
//             </div>
//           </div>

//           {/* Section Blocks - Tests by Department for this page */}
//           {page.groups.map((group, groupIndex) => {
//             // Check if this group contains only microbiology tests
//             const hasOnlyMicrobiologyTests = group.tests.every(test => test.cultureResult);

//             return (
//               <div key={`${pageIndex}-${groupIndex}`} style={{ marginBottom: '4px', flexShrink: 0 }}>
//                 {/* Section Title */}
//                 <div className="section-title">{group.department}</div>

//                 {/* Test Results Table */}
//                 <table>
//                   <tbody>
//                     {group.tests.map((test) => (
//                       <React.Fragment key={test.id}>
//                         {/* Check if this is a microbiology test with culture results */}
//                         {test.cultureResult ? (
//                           /* For microbiology tests, show C&S report directly without table structure */
//                           <tr>
//                             <td colSpan={1} style={{ padding: 0, border: 'none' }}>
//                               <MicrobiologyReportDisplay test={test} visit={visit} />
//                             </td>
//                           </tr>
//                         ) : (
//                           <>
//                             {/* Test Name Row with Specimen Type - appears first */}
//                             <tr className="test-group-row">
//                               <td colSpan={4}>
//                                 {test.template.name}
//                                 {test.specimen_type && (
//                                   <span style={{ fontSize: '9px', fontWeight: 'normal', marginLeft: '10px', color: '#333' }}>
//                                     (Specimen: {test.specimen_type})
//                                   </span>
//                                 )}
//                               </td>
//                             </tr>
//                             {/* Table Headers Row - appears second */}
//                             {!hasOnlyMicrobiologyTests && (
//                               <tr>
//                                 <th style={{ width: '40%' }}>Test Description</th>
//                                 <th style={{ width: '15%', textAlign: 'center' }}>Result</th>
//                                 <th style={{ width: '15%', textAlign: 'center' }}>Units</th>
//                                 <th style={{ width: '30%' }}>Biological Reference Range</th>
//                               </tr>
//                             )}
//                             {/* Parameter Rows for regular tests */}
//                             {test.template.parameters?.fields && test.template.parameters.fields.length > 0 ? (
//                               <>
//                                 {test.template.parameters.fields.map((param: any, paramIndex: number) => {
//                                 // Check if this is a heading type parameter
//                                 if (param.type === 'heading') {
//                                   return (
//                                     <tr key={`heading-${paramIndex}`} style={{ backgroundColor: '#f3f4f6' }}>
//                                       <td colSpan={4} style={{
//                                         fontWeight: 'bold',
//                                         fontSize: '8px',
//                                         padding: '4px 6px',
//                                         textTransform: 'uppercase',
//                                         color: '#000',
//                                         verticalAlign: 'middle'
//                                       }}>
//                                         {param.name}
//                                       </td>
//                                     </tr>
//                                   );
//                                 }
//                                 // Regular parameter row
//                                 return (
//                                   <React.Fragment key={param.name}>
//                                     <tr>
//                                       <td>
//                                         <div>{param.name}</div>
//                                         {param.method && (
//                                           <div style={{ fontSize: '7px', color: '#555', fontWeight: '400' }}>
//                                             ({param.method})
//                                           </div>
//                                         )}
//                                       </td>
//                                       <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
//                                         {String(test.results?.[param.name] ?? '-')}
//                                       </td>
//                                       <td style={{ textAlign: 'center' }}>{param.unit ?? ''}</td>
//                                       <td>{param.reference_range ?? ''}</td>
//                                     </tr>
//                                   </React.Fragment>
//                                 );
//                               })}
//                               </>
//                             ) : (
//                               <tr>
//                                 <td colSpan={4} style={{ textAlign: 'center' }}>No parameters</td>
//                               </tr>
//                             )}
//                           </>
//                         )}
//                       </React.Fragment>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             );
//           })}

//           {/* End of Report - Only on last page */}
//           {pageIndex === reportPages.length - 1 && (
//             <div style={{
//               textAlign: 'center',
//               fontWeight: 'bold',
//               margin: '6px 0',
//               padding: '4px 0',
//               fontSize: '9px',
//               flexShrink: 0
//             }}>
//               ** End of Report **
//             </div>
//           )}
//         </div>

//         {/* Footer Section - COMPACT & ALWAYS AT BOTTOM */}
//         <div className="report-footer" style={{
//           borderTop: '0.5px solid #666',
//           paddingTop: '4px',
//           fontSize: '8px',
//           flexShrink: 0
//         }}>
//           {/* Signatories - COMPACT with real approver data */}
//           <div style={{
//             display: 'flex',
//             justifyContent: 'space-between',
//             alignItems: 'flex-end',
//             marginBottom: '4px',
//             minHeight: '30px'
//           }}>
//             {approvers.length > 0 ? (
//               <>
//                 {/* Dynamic Approvers */}
//                 {approvers.map((approver: Approver, index: number) => (
//                   <div key={approver.id} style={{ textAlign: index === 0 ? 'left' : index === approvers.length - 1 ? 'right' : 'center', flex: 1 }}>
//                     {/* Show signature image if present, otherwise show signature line */}
//                     {approver.signature_image_url ? (
//                       <img
//                         src={`${IMAGE_BASE_URL}${approver.signature_image_url}`}
//                         alt="Signature"
//                         style={{ maxWidth: '80px', maxHeight: '25px', marginBottom: '2px', display: 'block', margin: index === 0 ? '0 0 2px 0' : index === approvers.length - 1 ? '0 0 2px auto' : '0 auto 2px' }}
//                         onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
//                           console.error('Failed to load signature image:', approver.signature_image_url);
//                           console.error('Full URL:', `${IMAGE_BASE_URL}${approver.signature_image_url}`);
//                           e.currentTarget.style.display = 'none';
//                         }}
//                       />
//                     ) : (
//                       <div style={{
//                         width: '80px',
//                         height: '20px',
//                         borderBottom: '0.5px solid #666',
//                         marginBottom: '2px',
//                         margin: index === 0 ? '0 0 2px 0' : index === approvers.length - 1 ? '0 0 2px auto' : '0 auto 2px'
//                       }}></div>
//                     )}
//                     <div style={{ fontWeight: 'bold', fontSize: '8px', marginBottom: '1px', color: '#000' }}>
//                       {approver.name}
//                     </div>
//                     <div style={{ fontSize: '7px', color: '#000' }}>
//                       {approver.title}
//                     </div>
//                   </div>
//                 ))}

//                 {/* QR Code and Lab Tech - Side by side */}
//                 {visit.qr_code && (
//                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' }}>
//                     <div style={{ textAlign: 'center' }}>
//                       <div style={{ width: '40px', height: '40px', margin: '0 auto' }}>
//                         <img
//                           src={visit.qr_code}
//                           alt="QR Code"
//                           style={{ width: '100%', height: '100%', display: 'block' }}
//                         />
//                       </div>
//                       <div style={{ fontSize: '6px', color: '#000', marginTop: '2px' }}>
//                         Scan to verify
//                       </div>
//                     </div>
//                     <div style={{ textAlign: 'left', borderLeft: '0.5px solid #666', paddingLeft: '8px' }}>
//                       <div style={{ fontSize: '7px', color: '#000', marginBottom: '2px' }}>
//                         Lab Technician
//                       </div>
//                       <div style={{ fontSize: '8px', color: '#000', fontWeight: 'bold' }}>
//                         {firstTest.enteredBy || 'N/A'}
//                       </div>
//                     </div>
//                   </div>
//                 )}
//               </>
//             ) : (
//               <>
//                 {/* Fallback: Show default signatory and QR code */}
//                 <div style={{ textAlign: 'left', flex: 1 }}>
//                   <div style={{
//                     width: '80px',
//                     height: '20px',
//                     borderBottom: '0.5px solid #666',
//                     marginBottom: '2px'
//                   }}></div>
//                   <div style={{ fontWeight: 'bold', fontSize: '8px', marginBottom: '1px', color: '#000' }}>
//                     Lab Director
//                   </div>
//                   <div style={{ fontSize: '7px', color: '#000' }}>
//                     Pathologist
//                   </div>
//                 </div>

//                 {/* QR Code and Lab Tech - Side by side */}
//                 {visit.qr_code && (
//                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' }}>
//                     <div style={{ textAlign: 'center' }}>
//                       <div style={{ width: '40px', height: '40px', margin: '0 auto' }}>
//                         <img
//                           src={visit.qr_code}
//                           alt="QR Code"
//                           style={{ width: '100%', height: '100%', display: 'block' }}
//                         />
//                       </div>
//                       <div style={{ fontSize: '6px', color: '#000', marginTop: '2px' }}>
//                         Scan to verify
//                       </div>
//                     </div>
//                     <div style={{ textAlign: 'left', borderLeft: '0.5px solid #666', paddingLeft: '8px' }}>
//                       <div style={{ fontSize: '7px', color: '#000', marginBottom: '2px' }}>
//                         Lab Technician
//                       </div>
//                       <div style={{ fontSize: '8px', color: '#000', fontWeight: 'bold' }}>
//                         {firstTest.enteredBy || 'N/A'}
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 {/* Empty space for balance */}
//                 <div style={{ flex: 1 }}></div>
//               </>
//             )}
//           </div>

//           {/* Footer Notes - ALL DISCLAIMERS */}
//           <div style={{
//             fontSize: '7px',
//             lineHeight: '1.3',
//             color: '#000',
//             marginTop: '4px',
//             paddingTop: '4px',
//             borderTop: '0.5px solid #666'
//           }}>
//             <p style={{ margin: '1px 0' }}>
//               Assay result should be correlated clinically with other laboratory finding and the total clinical status of the patient.
//             </p>
//             <p style={{ margin: '1px 0' }}>
//               Note :- This Report is subject to the terms and conditions mentioned overleaf
//             </p>
//             <p style={{ margin: '1px 0', fontWeight: 'bold' }}>
//               Note :- PARTIAL REPRODUCTION OF THIS REPORT IS NOT PERMITTED
//             </p>
//           </div>

//           {/* Page Number */}
//           <div style={{
//             textAlign: 'center',
//             fontSize: '8px',
//             marginTop: '3px',
//             color: '#000'
//           }}>
//             Page {pageIndex + 1} of {totalPages}
//           </div>
//         </div>
//       </div>
//       ))}
//     </>
//   );
// };


import React, { useEffect, useRef, useState } from 'react';
import { VisitTest, Visit, Signatory, Approver } from '../types';
import { useAppContext } from '../context/AppContext';
import { API_BASE_URL } from '../config/api';
import { MicrobiologyReportDisplay } from './MicrobiologyReportDisplay';

// --- Barcode component (kept small and lazy-loaded) ---
const BarcodeComponent: React.FC<{ value: string }> = ({ value }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

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
      .catch((err) => console.error('Error loading jsbarcode', err));

    return () => {
      cancelled = true;
    };
  }, [value]);

  return <svg ref={barcodeRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />;
};

// --- Helpers for formatting ---
const formatAge = (p: Visit['patient']) => {
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

// --- Pagination and counting logic ---
// We compute "display rows" rather than just parameter counts. Every rendered row is counted:
// - Group header: 1 row (rendered once per group on a page)
// - Test title: 1 row per test
// - Parameter rows: each parameter (heading or normal) renders as 1 row
// - Microbiology (culture) tests are treated as a single block that MUST start on a new page. We estimate their block height
//   using available properties (e.g. cultureResult.lines) when present, otherwise use a conservative default.

const DEFAULT_MICROBIOLOGY_BLOCK_ROWS = 12; // conservative default estimate for C&S block height
const HEADER_ROWS_RESERVE = 8; // rows used by patient header area on each page (conservative)
const FOOTER_ROWS_RESERVE = 6; // rows reserved for footer / signatories
const CONTENT_ROWS_PER_PAGE = 42 - HEADER_ROWS_RESERVE - FOOTER_ROWS_RESERVE; // adjustable

const isCultureTest = (test: VisitTest) => !!test.cultureResult;

const estimateMicrobiologyRows = (test: VisitTest) => {
  // If cultureResult has lines or a textual array, use that to estimate rows
  // This is flexible and tolerant to unknown shapes of cultureResult
  try {
    const r: any = test.cultureResult as any;
    if (!r) return DEFAULT_MICROBIOLOGY_BLOCK_ROWS;
    if (Array.isArray(r.lines) && r.lines.length > 0) return Math.max(DEFAULT_MICROBIOLOGY_BLOCK_ROWS, r.lines.length + 4);
    if (typeof r.description === 'string') {
      // approximate by line breaks
      const lines = r.description.split(/\r?\n/).filter(Boolean).length;
      return Math.max(DEFAULT_MICROBIOLOGY_BLOCK_ROWS, lines + 4);
    }
  } catch (e) {
    // ignore and fall back
  }
  return DEFAULT_MICROBIOLOGY_BLOCK_ROWS;
};

const countDisplayRowsForTest = (test: VisitTest) => {
  // Test title row
  let rows = 1;

  // Parameters
  const fields = test.template?.parameters?.fields || [];
  if (fields.length === 0) {
    // one empty row to show "No parameters"
    rows += 1;
  } else {
    // each parameter (heading or normal) renders as 1 row
    rows += fields.length;
  }

  // Microbiology handled separately by the pagination routine (we still return a positive number)
  if (isCultureTest(test)) {
    // return a conservative estimate here
    return Math.max(rows, estimateMicrobiologyRows(test));
  }

  return rows;
};

interface PageGroup {
  department: string;
  tests: VisitTest[];
  displayRows: number; // total rows for the group (includes group header)
}

interface ReportPage {
  pageNumber: number;
  groups: PageGroup[];
  usedRows: number;
}

const createReportPages = (testsByCategory: Record<string, VisitTest[]>) => {
  const pages: ReportPage[] = [];
  let currentPage: ReportPage = { pageNumber: 1, groups: [], usedRows: 0 };

  // reserve header/footer rows upfront
  const usableRows = CONTENT_ROWS_PER_PAGE;

  const pushPage = () => {
    if (currentPage.groups.length > 0) {
      pages.push(currentPage);
    }
    currentPage = { pageNumber: pages.length + 1, groups: [], usedRows: 0 };
  };

  Object.entries(testsByCategory).forEach(([department, tests]) => {
    // We'll treat the group's header as a single row when it first appears on a page
    tests.forEach((test) => {
      const isCulture = isCultureTest(test);
      const testRows = countDisplayRowsForTest(test);

      // If culture test: must start on a fresh page
      if (isCulture) {
        // If current page has any content, push it
        if (currentPage.groups.length > 0) pushPage();

        // Start a brand new page and add the culture test as its own group
        const cultureRows = Math.max(testRows, estimateMicrobiologyRows(test));
        const group: PageGroup = { department, tests: [test], displayRows: cultureRows + 1 }; // +1 for group header
        // If culture block is bigger than usableRows we still place it (it will overflow physically but we must not split)
        currentPage.groups.push(group);
        currentPage.usedRows += group.displayRows;

        // save and move to next page for subsequent tests
        pushPage();
        return;
      }

      // Non-culture test handling -------------------------------------------------
      // Check if the department already exists on the current page
      const existing = currentPage.groups.find(g => g.department === department);

      if (existing) {
        // If adding this test would exceed page usable rows, we need a new page
        if (currentPage.usedRows + testRows > usableRows) {
          pushPage();
          // create a new group for the department on the fresh page
          const newGroup: PageGroup = { department, tests: [test], displayRows: testRows + 1 };
          currentPage.groups.push(newGroup);
          currentPage.usedRows += newGroup.displayRows;
        } else {
          // append to existing group
          existing.tests.push(test);
          existing.displayRows += testRows;
          currentPage.usedRows += testRows;
        }
      } else {
        // Department not present on current page, so we will add it
        // If the department header + test rows exceed usableRows and the current page is not empty -> new page
        const groupHeaderAndTest = 1 + testRows; // 1 row for group header
        if (currentPage.groups.length > 0 && currentPage.usedRows + groupHeaderAndTest > usableRows) {
          pushPage();
        }
        const newGroup: PageGroup = { department, tests: [test], displayRows: groupHeaderAndTest };
        currentPage.groups.push(newGroup);
        currentPage.usedRows += groupHeaderAndTest;
      }
    });
  });

  // final page push
  if (currentPage.groups.length > 0) pages.push(currentPage);

  // Verification - ensure every test is present
  const totalTestsInPages = pages.reduce((sum, p) => sum + p.groups.reduce((gs, g) => gs + g.tests.length, 0), 0);
  const totalTestsOriginal = Object.values(testsByCategory).reduce((sum, t) => sum + t.length, 0);

  if (totalTestsInPages !== totalTestsOriginal) {
    console.error('PAGINATION MISMATCH', { totalTestsOriginal, totalTestsInPages, pages });
  }

  return pages;
};

// --- Component ---
interface TestReportProps {
  visit: Visit;
  signatory: Signatory;
}

const TestReport: React.FC<TestReportProps> = ({ visit, signatory }) => {
  const { visitTests } = useAppContext();
  const [approvers, setApprovers] = useState<Approver[]>([]);

  if (!visit) return <div className="bg-white p-8 max-w-4xl mx-auto text-red-500">Error: Visit data not found.</div>;

  // Only APPROVED or PRINTED allowed
  const approvedTestsForVisit = visit.tests
    .map((testId: number) => visitTests.find(vt => vt.id === testId && (vt.status === 'APPROVED' || vt.status === 'PRINTED')))
    .filter(Boolean) as VisitTest[];

  if (approvedTestsForVisit.length === 0) return <div className="bg-white p-8 max-w-4xl mx-auto text-yellow-600">Report not ready. No approved or printed tests found for this visit.</div>;

  const firstTest = approvedTestsForVisit[0];

  const doctorName = visit.referred_doctor_name
    ? visit.referred_doctor_designation
      ? `${visit.referred_doctor_name}, ${visit.referred_doctor_designation}`
      : visit.referred_doctor_name
    : visit.other_ref_doctor || 'N/A';

  const testsByCategory = approvedTestsForVisit.reduce((acc, test) => {
    const category = test.template?.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(test);
    return acc;
  }, {} as Record<string, VisitTest[]>);

  // Create paginated pages using the robust row counting
  const reportPages = createReportPages(testsByCategory);

  // --- Fetch approvers (optimized: fetch users once) ---
  useEffect(() => {
    let mounted = true;
    const fetchApprovers = async () => {
      try {
        const approvedTests = approvedTestsForVisit;
        const approverUsernames = [...new Set(approvedTests.map(t => t.approvedBy).filter(Boolean))];

        const authToken = sessionStorage.getItem('authToken');

        // If no approvers found in tests -> fallback to /approvers
        if (approverUsernames.length === 0) {
          const resp = await fetch(`${API_BASE_URL}/approvers`);
          const data = await resp.json();
          if (!mounted) return;
          setApprovers(data.filter((a: Approver) => a.show_on_print));
          return;
        }

        // Fetch users once
        const respUsers = await fetch(`${API_BASE_URL}/users`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });
        const users = await respUsers.json();
        if (!mounted) return;

        const fetchedApprovers: Approver[] = approverUsernames.map((username) => {
          const user = users.find((u: any) => u.username === username);
          if (!user) return null;
          return {
            id: user.id,
            name: user.display_name || user.username,
            title: user.role || user.designation || '-',
            signature_image_url: user.signature_image_url,
            show_on_print: true
          } as Approver;
        }).filter(Boolean) as Approver[];

        // If none matched, fallback to /approvers
        if (fetchedApprovers.length === 0) {
          const resp = await fetch(`${API_BASE_URL}/approvers`);
          const data = await resp.json();
          if (!mounted) return;
          setApprovers(data.filter((a: Approver) => a.show_on_print));
          return;
        }

        setApprovers(fetchedApprovers);
      } catch (err) {
        console.error('Error fetching approvers', err);
        try {
          const resp = await fetch(`${API_BASE_URL}/approvers`);
          const data = await resp.json();
          if (mounted) setApprovers(data.filter((a: Approver) => a.show_on_print));
        } catch (er) {
          console.error('Fallback approvers fetch failed', er);
        }
      }
    };

    fetchApprovers();
    return () => { mounted = false; };
  }, [visit.id]);

  // Derive sample drawn and reported dates
  const testsForVisit = visitTests.filter(t => visit.tests.includes(t.id));
  const sampleDrawnDate = testsForVisit.map(t => t.collectedAt).filter(Boolean).sort()[0];
  const reportedDate = testsForVisit.map(t => t.approvedAt).filter(Boolean).sort()[0];

  const IMAGE_BASE_URL = API_BASE_URL.replace('/api', '');

  // --- Render ---
  return (
    <>
      <style>{`/* minimal inline styles for printing handled by outer app */`}</style>

      {reportPages.map((page, pageIndex) => (
        <div key={pageIndex} className="report-page" style={{ pageBreakAfter: pageIndex < reportPages.length - 1 ? 'always' : 'auto', padding: '12mm' }}>
          {/* Header / Patient block (kept compact) */}
          <div style={{ marginBottom: '6px', borderBottom: '1px solid #ccc', paddingBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div><strong>Patient Name:</strong> {visit.patient.name}</div>
                <div><strong>Age / Gender:</strong> {formatAge(visit.patient)} / {visit.patient.sex}</div>
                <div><strong>Referred By:</strong> {doctorName}</div>
              </div>
              <div style={{ width: 120 }}>
                <BarcodeComponent value={visit.visit_code} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '6px', fontSize: 12 }}>
              <div><strong>Visit Id</strong><div>{visit.visit_code}</div></div>
              <div><strong>Sample Drawn</strong><div>{formatDate(sampleDrawnDate)}</div></div>
              <div><strong>Registration</strong><div>{formatDate(visit.created_at)}</div></div>
              <div><strong>Reported</strong><div>{formatDate(reportedDate)}</div></div>
            </div>
          </div>

          {/* Content groups for this page */}
          {page.groups.map((group, gi) => (
            <div key={`${pageIndex}-${gi}`} style={{ marginBottom: '6px' }}>
              <div style={{ background: '#eee', padding: '4px', fontWeight: 700, textTransform: 'uppercase' }}>{group.department}</div>

              {/* If the group contains a single culture test, render the microbiology block directly */}
              {group.tests.map((test) => (
                <div key={test.id} style={{ marginTop: '4px' }}>
                  {isCultureTest(test) ? (
                    <div>
                      <MicrobiologyReportDisplay test={test} visit={visit} />
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', width: '40%' }}>Test Description</th>
                          <th style={{ textAlign: 'center', width: '15%' }}>Result</th>
                          <th style={{ textAlign: 'center', width: '15%' }}>Units</th>
                          <th style={{ textAlign: 'left', width: '30%' }}>Biological Reference Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ fontWeight: 700, background: '#fafafa' }}>
                          <td colSpan={4}>{test.template.name}{test.specimen_type ? ` (Specimen: ${test.specimen_type})` : ''}</td>
                        </tr>

                        {test.template?.parameters?.fields && test.template.parameters.fields.length > 0 ? (
                          test.template.parameters.fields.map((param: any, idx: number) => (
                            param.type === 'heading' ? (
                              <tr key={`heading-${test.id}-${idx}`} style={{ background: '#f3f4f6' }}>
                                <td colSpan={4} style={{ fontWeight: 700 }}>{param.name}</td>
                              </tr>
                            ) : (
                              <tr key={`${test.id}-${param.name}`}> 
                                <td>
                                  <div style={{ fontSize: 11 }}>{param.name}</div>
                                  {param.method && <div style={{ fontSize: 9, color: '#555' }}>({param.method})</div>}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 700 }}>{String(test.results?.[param.name] ?? '-')}</td>
                                <td style={{ textAlign: 'center' }}>{param.unit ?? ''}</td>
                                <td>{param.reference_range ?? ''}</td>
                              </tr>
                            )
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center' }}>No parameters</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Footer - signatures / QR */}
          <div style={{ borderTop: '1px solid #ccc', marginTop: '8px', paddingTop: '6px', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              {approvers.length > 0 ? (
                approvers.map((a, idx) => (
                  <div key={a.id} style={{ textAlign: 'center', flex: 1 }}>
                    {a.signature_image_url ? (
                      <img src={`${IMAGE_BASE_URL}${a.signature_image_url}`} alt="signature" style={{ maxWidth: 90, maxHeight: 28 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div style={{ height: 20, borderBottom: '1px solid #666', marginBottom: 2 }} />
                    )}
                    <div style={{ fontWeight: 700, fontSize: 11 }}>{a.name}</div>
                    <div style={{ fontSize: 10 }}>{a.title}</div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ height: 20, borderBottom: '1px solid #666', marginBottom: 2 }} />
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

// export default TestReport;
