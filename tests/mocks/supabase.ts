/**
 * Supabase mock — returns predictable data for tests.
 * Each test can override specific table responses.
 */

import { vi } from 'vitest';

export type MockTableData = Record<string, any[]>;

let mockData: MockTableData = {};

export function setMockData(table: string, data: any[]) {
  mockData[table] = data;
}

export function clearMockData() {
  mockData = {};
}

// Build a chainable mock that mimics Supabase's query builder
function createQueryBuilder(table: string) {
  let filteredData = [...(mockData[table] || [])];
  let isCount = false;
  let isSingle = false;
  let limitN = 100;

  const builder: any = {
    select: (fields?: string, opts?: any) => {
      // Reset filteredData on each new query chain
      filteredData = [...(mockData[table] || [])];
      if (opts?.count === 'exact') isCount = true;
      if (opts?.head) isSingle = true;
      return builder;
    },
    insert: (data: any) => {
      const rows = Array.isArray(data) ? data : [data];
      if (!mockData[table]) mockData[table] = [];
      rows.forEach(r => {
        const row = { id: crypto.randomUUID(), ...r, created_at: new Date().toISOString() };
        mockData[table].push(row);
      });
      return builder;
    },
    update: (_data: any) => {
      return builder;
    },
    upsert: (_data: any, _opts?: any) => {
      return builder;
    },
    delete: () => {
      return builder;
    },
    eq: (col: string, val: any) => {
      filteredData = filteredData.filter(r => r[col] === val);
      return builder;
    },
    neq: (col: string, val: any) => {
      filteredData = filteredData.filter(r => r[col] !== val);
      return builder;
    },
    gt: (col: string, val: any) => {
      filteredData = filteredData.filter(r => r[col] > val);
      return builder;
    },
    lt: (col: string, val: any) => {
      filteredData = filteredData.filter(r => r[col] < val);
      return builder;
    },
    lte: (col: string, val: any) => {
      filteredData = filteredData.filter(r => r[col] <= val);
      return builder;
    },
    gte: (col: string, val: any) => {
      filteredData = filteredData.filter(r => r[col] >= val);
      return builder;
    },
    ilike: (col: string, pattern: string) => {
      const search = pattern.replace(/%/g, '').toLowerCase();
      filteredData = filteredData.filter(r => (r[col] || '').toLowerCase().includes(search));
      return builder;
    },
    in: (col: string, vals: any[]) => {
      filteredData = filteredData.filter(r => vals.includes(r[col]));
      return builder;
    },
    not: (col: string, op: string, val: any) => {
      if (op === 'is') filteredData = filteredData.filter(r => r[col] !== val);
      return builder;
    },
    is: (col: string, val: any) => {
      filteredData = filteredData.filter(r => r[col] === val);
      return builder;
    },
    textSearch: (_col: string, _query: string, _opts?: any) => {
      return builder;
    },
    order: (col: string, opts?: any) => {
      const asc = opts?.ascending !== false;
      filteredData.sort((a: any, b: any) => {
        if (asc) return a[col] > b[col] ? 1 : -1;
        return a[col] < b[col] ? 1 : -1;
      });
      return builder;
    },
    limit: (n: number) => {
      limitN = n;
      return builder;
    },
    single: () => {
      isSingle = true;
      return builder;
    },
    maybeSingle: () => {
      isSingle = true;
      return builder;
    },
    then: (resolve: any) => {
      const sliced = filteredData.slice(0, limitN);
      if (isCount) {
        resolve({ count: filteredData.length, data: null, error: null });
      } else if (isSingle) {
        resolve({ data: sliced[0] || null, error: sliced[0] ? null : null });
      } else {
        resolve({ data: sliced, error: null });
      }
    },
    catch: (_handler: any) => builder,
  };

  return builder;
}

export function createMockSupabase() {
  return {
    from: (table: string) => createQueryBuilder(table),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

// Mock the @supabase/supabase-js module
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => createMockSupabase(),
}));
