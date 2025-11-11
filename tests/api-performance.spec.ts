import { test, expect } from '@playwright/test';

interface APICallInfo {
  url: string;
  method: string;
  timestamp: number;
  responseSize: number;
  duration: number;
  status: number;
}

interface APIReport {
  totalCalls: number;
  totalDataTransferred: number;
  totalDuration: number;
  callsByEndpoint: Map<string, number>;
  callsByMethod: Map<string, number>;
  duplicateCalls: Array<{ url: string; count: number }>;
  timeline: APICallInfo[];
}

test.describe('API Performance Analysis', () => {
  let apiCalls: APICallInfo[] = [];
  
  test.beforeEach(async ({ page }) => {
    apiCalls = [];
    
    // Intercept all API calls
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const startTime = Date.now();
      
      const response = await route.fetch();
      const endTime = Date.now();
      
      const body = await response.body();
      const responseSize = body.length;
      
      apiCalls.push({
        url: request.url(),
        method: request.method(),
        timestamp: startTime,
        responseSize: responseSize,
        duration: endTime - startTime,
        status: response.status()
      });
      
      await route.fulfill({ response });
    });
  });

  test('Measure API calls on initial page load (no interaction)', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST: Initial Page Load (No Interaction)');
    console.log('========================================\n');
    
    const startTime = Date.now();
    
    // Navigate to login page
    await page.goto('http://localhost:3000');
    
    // Login
    await page.fill('input[placeholder="Username"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button:has-text("Login")');
    
    // Wait for main page to load
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    
    // Wait for 30 seconds without any interaction
    console.log('⏳ Waiting 30 seconds without any interaction...\n');
    await page.waitForTimeout(30000);
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    // Generate report
    const report = generateReport(apiCalls, totalDuration);
    printReport(report, 'INITIAL PAGE LOAD (30s, NO INTERACTION)');
    
    // Assertions
    expect(report.totalCalls).toBeLessThan(20); // Should not make more than 20 calls
    expect(report.totalDataTransferred).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
  });

  test('Measure API calls when navigating between views', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST: Navigation Between Views');
    console.log('========================================\n');
    
    // Login first
    await page.goto('http://localhost:3000');
    await page.fill('input[placeholder="Username"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button:has-text("Login")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    
    // Clear API calls from login
    apiCalls = [];
    const startTime = Date.now();
    
    // Navigate to different views
    console.log('📍 Navigating to Create Visit...');
    await page.click('text=Create Visit');
    await page.waitForTimeout(2000);
    
    console.log('📍 Navigating to Phlebotomy Queue...');
    await page.click('text=Phlebotomy Queue');
    await page.waitForTimeout(2000);
    
    console.log('📍 Navigating to Lab Queue...');
    await page.click('text=Lab Queue');
    await page.waitForTimeout(2000);
    
    console.log('📍 Navigating to Approver Queue...');
    await page.click('text=Approver Queue');
    await page.waitForTimeout(2000);
    
    console.log('📍 Navigating back to Dashboard...');
    await page.click('text=Dashboard');
    await page.waitForTimeout(2000);
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    // Generate report
    const report = generateReport(apiCalls, totalDuration);
    printReport(report, 'NAVIGATION BETWEEN VIEWS');
    
    // Assertions
    expect(report.totalCalls).toBeLessThan(10); // Should not reload data on navigation
    expect(report.totalDataTransferred).toBeLessThan(2 * 1024 * 1024); // Less than 2MB
  });

  test('Measure API calls when opening Admin panel', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST: Opening Admin Panel');
    console.log('========================================\n');
    
    // Login first
    await page.goto('http://localhost:3000');
    await page.fill('input[placeholder="Username"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button:has-text("Login")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    
    // Clear API calls from login
    apiCalls = [];
    const startTime = Date.now();
    
    // Open Admin panel
    console.log('📍 Opening Admin panel...');
    await page.click('text=Admin');
    await page.waitForTimeout(2000);
    
    // Navigate through admin sections
    console.log('📍 Opening Manage Test Prices...');
    await page.click('text=Manage Test Prices');
    await page.waitForTimeout(3000);
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    // Generate report
    const report = generateReport(apiCalls, totalDuration);
    printReport(report, 'OPENING ADMIN PANEL & MANAGE TEST PRICES');
    
    // Assertions
    expect(report.totalCalls).toBeLessThan(5); // Should not make many calls
    expect(report.totalDataTransferred).toBeLessThan(1 * 1024 * 1024); // Less than 1MB
  });

  test('Measure API calls during idle time (polling check)', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST: Idle Time (Check for Polling)');
    console.log('========================================\n');
    
    // Login first
    await page.goto('http://localhost:3000');
    await page.fill('input[placeholder="Username"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button:has-text("Login")');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    
    // Wait for initial load to complete
    await page.waitForTimeout(5000);
    
    // Clear API calls
    apiCalls = [];
    const startTime = Date.now();
    
    // Wait for 60 seconds to check for polling
    console.log('⏳ Waiting 60 seconds to detect polling...\n');
    await page.waitForTimeout(60000);
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    // Generate report
    const report = generateReport(apiCalls, totalDuration);
    printReport(report, 'IDLE TIME (60s) - POLLING DETECTION');
    
    // Assertions
    expect(report.totalCalls).toBe(0); // Should not make ANY calls during idle time
  });
});

function generateReport(calls: APICallInfo[], totalDuration: number): APIReport {
  const callsByEndpoint = new Map<string, number>();
  const callsByMethod = new Map<string, number>();
  let totalDataTransferred = 0;
  
  // Process each call
  calls.forEach(call => {
    // Extract endpoint from URL
    const url = new URL(call.url);
    const endpoint = url.pathname;
    
    // Count by endpoint
    callsByEndpoint.set(endpoint, (callsByEndpoint.get(endpoint) || 0) + 1);
    
    // Count by method
    callsByMethod.set(call.method, (callsByMethod.get(call.method) || 0) + 1);
    
    // Sum data transferred
    totalDataTransferred += call.responseSize;
  });
  
  // Find duplicate calls (same endpoint called multiple times)
  const duplicateCalls: Array<{ url: string; count: number }> = [];
  callsByEndpoint.forEach((count, url) => {
    if (count > 1) {
      duplicateCalls.push({ url, count });
    }
  });
  
  return {
    totalCalls: calls.length,
    totalDataTransferred,
    totalDuration,
    callsByEndpoint,
    callsByMethod,
    duplicateCalls,
    timeline: calls
  };
}

function printReport(report: APIReport, testName: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 API PERFORMANCE REPORT: ${testName}`);
  console.log(`${'='.repeat(80)}\n`);
  
  console.log('📈 SUMMARY:');
  console.log(`   Total API Calls: ${report.totalCalls}`);
  console.log(`   Total Data Transferred: ${formatBytes(report.totalDataTransferred)}`);
  console.log(`   Total Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
  console.log(`   Average Call Duration: ${report.totalCalls > 0 ? (report.timeline.reduce((sum, c) => sum + c.duration, 0) / report.totalCalls).toFixed(2) : 0}ms\n`);
  
  console.log('📍 CALLS BY HTTP METHOD:');
  report.callsByMethod.forEach((count, method) => {
    console.log(`   ${method}: ${count} calls`);
  });
  console.log('');
  
  console.log('🔗 CALLS BY ENDPOINT:');
  const sortedEndpoints = Array.from(report.callsByEndpoint.entries())
    .sort((a, b) => b[1] - a[1]);
  sortedEndpoints.forEach(([endpoint, count]) => {
    console.log(`   ${endpoint}: ${count} calls`);
  });
  console.log('');
  
  if (report.duplicateCalls.length > 0) {
    console.log('⚠️  DUPLICATE CALLS (POTENTIAL WASTE):');
    report.duplicateCalls
      .sort((a, b) => b.count - a.count)
      .forEach(({ url, count }) => {
        console.log(`   ${url}: ${count} times ❌`);
      });
    console.log('');
  }
  
  console.log('⏱️  TIMELINE (First 20 calls):');
  report.timeline.slice(0, 20).forEach((call, index) => {
    const relativeTime = ((call.timestamp - report.timeline[0].timestamp) / 1000).toFixed(2);
    console.log(`   ${index + 1}. [+${relativeTime}s] ${call.method} ${new URL(call.url).pathname} (${formatBytes(call.responseSize)}, ${call.duration}ms)`);
  });
  
  if (report.timeline.length > 20) {
    console.log(`   ... and ${report.timeline.length - 20} more calls`);
  }
  
  console.log(`\n${'='.repeat(80)}\n`);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

