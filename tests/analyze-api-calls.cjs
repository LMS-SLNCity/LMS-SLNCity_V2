#!/usr/bin/env node

/**
 * API Call Analyzer
 *
 * This script helps identify excessive API calls by analyzing the codebase
 * and finding patterns that cause unnecessary network requests.
 */

const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('🔍 API CALL ANALYZER');
console.log('========================================\n');

// Patterns that indicate potential API call issues
const patterns = {
  reloadData: {
    regex: /reloadData\(\)/g,
    description: 'Calls to reloadData() - loads ALL data from backend',
    severity: 'HIGH',
    files: []
  },
  useEffectWithDeps: {
    regex: /useEffect\([^)]+\),\s*\[[^\]]*\]/g,
    description: 'useEffect with dependencies - may cause re-renders',
    severity: 'MEDIUM',
    files: []
  },
  fetchInComponent: {
    regex: /fetch\([^)]+\)/g,
    description: 'Direct fetch calls in components',
    severity: 'MEDIUM',
    files: []
  },
  setInterval: {
    regex: /setInterval\(/g,
    description: 'Polling with setInterval - continuous API calls',
    severity: 'HIGH',
    files: []
  },
  setTimeout: {
    regex: /setTimeout\(/g,
    description: 'Delayed operations with setTimeout',
    severity: 'LOW',
    files: []
  }
};

// Files to analyze
const filesToAnalyze = [
  'context/AppContext.tsx',
  'context/AuthContext.tsx',
  'components/MainLayout.tsx',
  'components/AdminPanel.tsx',
  'components/CreateVisitForm.tsx',
  'components/CreateVisitFormNew.tsx',
  'components/LabQueue.tsx',
  'components/PhlebotomyQueue.tsx',
  'components/ApproverQueue.tsx',
  'components/admin/Dashboard.tsx',
  'components/admin/PriceManagement.tsx',
  'components/admin/UserManagement.tsx',
  'components/admin/ClientPriceEditorModal.tsx'
];

function analyzeFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  
  const results = {};
  
  Object.keys(patterns).forEach(patternName => {
    const pattern = patterns[patternName];
    const matches = [];
    
    lines.forEach((line, index) => {
      if (pattern.regex.test(line)) {
        matches.push({
          lineNumber: index + 1,
          line: line.trim()
        });
      }
    });
    
    if (matches.length > 0) {
      results[patternName] = matches;
    }
  });
  
  return results;
}

function printResults() {
  console.log('📊 ANALYSIS RESULTS:\n');
  
  let totalIssues = 0;
  const issuesByFile = new Map();
  
  filesToAnalyze.forEach(filePath => {
    const results = analyzeFile(filePath);
    
    if (results && Object.keys(results).length > 0) {
      issuesByFile.set(filePath, results);
      
      Object.keys(results).forEach(patternName => {
        totalIssues += results[patternName].length;
      });
    }
  });
  
  console.log(`Total potential issues found: ${totalIssues}\n`);
  console.log('='.repeat(80));
  
  // Print by severity
  ['HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
    const severityIssues = [];
    
    issuesByFile.forEach((results, filePath) => {
      Object.keys(results).forEach(patternName => {
        if (patterns[patternName].severity === severity) {
          severityIssues.push({
            file: filePath,
            pattern: patternName,
            matches: results[patternName]
          });
        }
      });
    });
    
    if (severityIssues.length > 0) {
      console.log(`\n🔴 ${severity} SEVERITY ISSUES:\n`);
      
      severityIssues.forEach(issue => {
        console.log(`📄 ${issue.file}`);
        console.log(`   Pattern: ${patterns[issue.pattern].description}`);
        console.log(`   Occurrences: ${issue.matches.length}`);
        
        issue.matches.forEach(match => {
          console.log(`   Line ${match.lineNumber}: ${match.line.substring(0, 80)}${match.line.length > 80 ? '...' : ''}`);
        });
        
        console.log('');
      });
    }
  });
  
  console.log('='.repeat(80));
  console.log('\n💡 RECOMMENDATIONS:\n');
  console.log('1. Remove reloadData() calls - use targeted updates instead');
  console.log('2. Review useEffect dependencies - avoid unnecessary re-renders');
  console.log('3. Eliminate polling (setInterval) - use WebSockets or manual refresh');
  console.log('4. Cache data in context - avoid redundant API calls');
  console.log('5. Use React Query or SWR for better data fetching');
  console.log('\n');
}

// Analyze specific known issues
function analyzeKnownIssues() {
  console.log('\n========================================');
  console.log('🔍 KNOWN ISSUES ANALYSIS');
  console.log('========================================\n');
  
  const knownIssues = [
    {
      file: 'components/MainLayout.tsx',
      issue: 'reloadData() called on every user change',
      line: 'useEffect(() => { reloadData(); }, [user, reloadData]);',
      impact: 'HIGH - Causes 10+ API calls on every render',
      status: 'FIXED'
    },
    {
      file: 'context/AppContext.tsx',
      issue: 'addVisit calls reloadData() after creating visit',
      line: 'await reloadData();',
      impact: 'HIGH - Loads all data (visits, tests, clients, etc.)',
      status: 'FIXED'
    },
    {
      file: 'context/AppContext.tsx',
      issue: 'rejectTestResult calls reloadData()',
      line: 'await reloadData();',
      impact: 'HIGH - Loads all data unnecessarily',
      status: 'FIXED'
    },
    {
      file: 'components/admin/PriceManagement.tsx',
      issue: 'useEffect with testTemplates dependency',
      line: 'useEffect(() => {...}, [testTemplates]);',
      impact: 'MEDIUM - May cause re-initialization on updates',
      status: 'NEEDS REVIEW'
    }
  ];
  
  knownIssues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.file}`);
    console.log(`   Issue: ${issue.issue}`);
    console.log(`   Impact: ${issue.impact}`);
    console.log(`   Status: ${issue.status}`);
    console.log('');
  });
}

// Estimate API call costs
function estimateCosts() {
  console.log('\n========================================');
  console.log('💰 ESTIMATED CLOUD COSTS');
  console.log('========================================\n');
  
  const scenarios = [
    {
      name: 'Initial Page Load (BEFORE FIX)',
      apiCalls: 12,
      dataTransferred: 30, // MB
      frequency: 'Per login'
    },
    {
      name: 'Initial Page Load (AFTER FIX)',
      apiCalls: 12,
      dataTransferred: 5, // MB
      frequency: 'Per login'
    },
    {
      name: 'Create Visit (BEFORE FIX)',
      apiCalls: 15,
      dataTransferred: 25, // MB
      frequency: 'Per visit creation'
    },
    {
      name: 'Create Visit (AFTER FIX)',
      apiCalls: 3,
      dataTransferred: 0.5, // MB
      frequency: 'Per visit creation'
    },
    {
      name: 'Navigation Between Views (BEFORE FIX)',
      apiCalls: 10,
      dataTransferred: 20, // MB
      frequency: 'Per navigation'
    },
    {
      name: 'Navigation Between Views (AFTER FIX)',
      apiCalls: 0,
      dataTransferred: 0, // MB
      frequency: 'Per navigation'
    }
  ];
  
  console.log('Assumptions:');
  console.log('- 100 users per day');
  console.log('- Each user logs in 2 times per day');
  console.log('- Each user creates 10 visits per day');
  console.log('- Each user navigates 20 times per day');
  console.log('- AWS API Gateway: $3.50 per million requests');
  console.log('- AWS Data Transfer: $0.09 per GB\n');
  
  const usersPerDay = 100;
  const loginsPerUser = 2;
  const visitsPerUser = 10;
  const navigationsPerUser = 20;
  
  let totalCallsBefore = 0;
  let totalCallsAfter = 0;
  let totalDataBefore = 0;
  let totalDataAfter = 0;
  
  scenarios.forEach(scenario => {
    let multiplier = 0;
    if (scenario.frequency === 'Per login') multiplier = usersPerDay * loginsPerUser;
    if (scenario.frequency === 'Per visit creation') multiplier = usersPerDay * visitsPerUser;
    if (scenario.frequency === 'Per navigation') multiplier = usersPerDay * navigationsPerUser;
    
    const calls = scenario.apiCalls * multiplier;
    const data = scenario.dataTransferred * multiplier;
    
    if (scenario.name.includes('BEFORE')) {
      totalCallsBefore += calls;
      totalDataBefore += data;
    } else {
      totalCallsAfter += calls;
      totalDataAfter += data;
    }
    
    console.log(`${scenario.name}:`);
    console.log(`  API Calls: ${scenario.apiCalls} × ${multiplier} = ${calls.toLocaleString()} per day`);
    console.log(`  Data: ${scenario.dataTransferred} MB × ${multiplier} = ${data.toLocaleString()} MB per day`);
    console.log('');
  });
  
  const costPerCallBefore = (totalCallsBefore / 1000000) * 3.50;
  const costPerCallAfter = (totalCallsAfter / 1000000) * 3.50;
  const costPerDataBefore = (totalDataBefore / 1024) * 0.09;
  const costPerDataAfter = (totalDataAfter / 1024) * 0.09;
  
  const totalCostBefore = costPerCallBefore + costPerDataBefore;
  const totalCostAfter = costPerCallAfter + costPerDataAfter;
  const savings = totalCostBefore - totalCostAfter;
  const savingsPercent = ((savings / totalCostBefore) * 100).toFixed(1);
  
  console.log('='.repeat(80));
  console.log('\n📊 DAILY COST COMPARISON:\n');
  console.log(`BEFORE FIX:`);
  console.log(`  Total API Calls: ${totalCallsBefore.toLocaleString()}`);
  console.log(`  Total Data Transfer: ${totalDataBefore.toLocaleString()} MB (${(totalDataBefore / 1024).toFixed(2)} GB)`);
  console.log(`  API Gateway Cost: $${costPerCallBefore.toFixed(4)}`);
  console.log(`  Data Transfer Cost: $${costPerDataBefore.toFixed(4)}`);
  console.log(`  TOTAL: $${totalCostBefore.toFixed(4)} per day`);
  console.log(`  MONTHLY: $${(totalCostBefore * 30).toFixed(2)}`);
  console.log(`  YEARLY: $${(totalCostBefore * 365).toFixed(2)}\n`);
  
  console.log(`AFTER FIX:`);
  console.log(`  Total API Calls: ${totalCallsAfter.toLocaleString()}`);
  console.log(`  Total Data Transfer: ${totalDataAfter.toLocaleString()} MB (${(totalDataAfter / 1024).toFixed(2)} GB)`);
  console.log(`  API Gateway Cost: $${costPerCallAfter.toFixed(4)}`);
  console.log(`  Data Transfer Cost: $${costPerDataAfter.toFixed(4)}`);
  console.log(`  TOTAL: $${totalCostAfter.toFixed(4)} per day`);
  console.log(`  MONTHLY: $${(totalCostAfter * 30).toFixed(2)}`);
  console.log(`  YEARLY: $${(totalCostAfter * 365).toFixed(2)}\n`);
  
  console.log(`💰 SAVINGS:`);
  console.log(`  Per Day: $${savings.toFixed(4)} (${savingsPercent}% reduction)`);
  console.log(`  Per Month: $${(savings * 30).toFixed(2)}`);
  console.log(`  Per Year: $${(savings * 365).toFixed(2)}`);
  console.log('\n');
}

// Run analysis
printResults();
analyzeKnownIssues();
estimateCosts();

console.log('========================================');
console.log('✅ Analysis Complete');
console.log('========================================\n');

