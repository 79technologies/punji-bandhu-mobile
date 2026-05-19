import type { Stock } from '../types/domain';

/**
 * Seed list of NSE/BSE stocks with placeholder last-traded prices.
 *
 * Replace with a real quote source per .claude/skills/api-integration/SKILL.md.
 * Until then this lets the app run end-to-end as a demo. Prices below are
 * static snapshots and will be stale within minutes.
 */
export const STOCKS: ReadonlyArray<Stock> = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', lastPrice: 2870.5 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', lastPrice: 3960.2 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE', lastPrice: 1672.0 },
  { symbol: 'INFY', name: 'Infosys', exchange: 'NSE', lastPrice: 1845.6 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE', lastPrice: 1244.3 },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', lastPrice: 815.4 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', exchange: 'NSE', lastPrice: 1580.8 },
  { symbol: 'ITC', name: 'ITC', exchange: 'NSE', lastPrice: 468.9 },
  { symbol: 'LT', name: 'Larsen & Toubro', exchange: 'NSE', lastPrice: 3580.1 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', exchange: 'NSE', lastPrice: 2615.5 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', exchange: 'NSE', lastPrice: 1762.0 },
  { symbol: 'AXISBANK', name: 'Axis Bank', exchange: 'NSE', lastPrice: 1190.6 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India', exchange: 'NSE', lastPrice: 12480.0 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', exchange: 'NSE', lastPrice: 7220.7 },
  { symbol: 'WIPRO', name: 'Wipro', exchange: 'NSE', lastPrice: 542.3 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries', exchange: 'NSE', lastPrice: 1815.2 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', exchange: 'NSE', lastPrice: 778.4 },
  { symbol: 'TATASTEEL', name: 'Tata Steel', exchange: 'NSE', lastPrice: 152.6 },
  { symbol: 'TITAN', name: 'Titan Company', exchange: 'NSE', lastPrice: 3415.0 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', exchange: 'NSE', lastPrice: 2384.5 },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation', exchange: 'NSE', lastPrice: 248.7 },
  { symbol: 'NTPC', name: 'NTPC', exchange: 'NSE', lastPrice: 372.1 },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation', exchange: 'NSE', lastPrice: 322.4 },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', exchange: 'NSE', lastPrice: 11420.0 },
  { symbol: 'NESTLEIND', name: 'Nestle India', exchange: 'NSE', lastPrice: 2298.0 },
  { symbol: 'M&M', name: 'Mahindra & Mahindra', exchange: 'NSE', lastPrice: 2914.5 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', exchange: 'NSE', lastPrice: 2456.0 },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ', exchange: 'NSE', lastPrice: 1308.7 },
  { symbol: 'JSWSTEEL', name: 'JSW Steel', exchange: 'NSE', lastPrice: 940.2 },
  { symbol: 'COALINDIA', name: 'Coal India', exchange: 'NSE', lastPrice: 412.8 },
  { symbol: 'HCLTECH', name: 'HCL Technologies', exchange: 'NSE', lastPrice: 1745.0 },
  { symbol: 'TECHM', name: 'Tech Mahindra', exchange: 'NSE', lastPrice: 1612.5 },
  { symbol: 'DRREDDY', name: 'Dr. Reddy’s Laboratories', exchange: 'NSE', lastPrice: 1252.0 },
  { symbol: 'CIPLA', name: 'Cipla', exchange: 'NSE', lastPrice: 1498.6 },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv', exchange: 'NSE', lastPrice: 1640.5 },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance', exchange: 'NSE', lastPrice: 712.3 },
  { symbol: 'BRITANNIA', name: 'Britannia Industries', exchange: 'NSE', lastPrice: 4880.0 },
  { symbol: 'GRASIM', name: 'Grasim Industries', exchange: 'NSE', lastPrice: 2645.0 },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank', exchange: 'NSE', lastPrice: 982.5 },
  { symbol: 'EICHERMOT', name: 'Eicher Motors', exchange: 'NSE', lastPrice: 4915.0 },
];

export function searchStocks(query: string): Stock[] {
  const q = query.trim().toUpperCase();
  if (q.length === 0) return STOCKS.slice(0, 12);
  return STOCKS.filter(
    (s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q),
  );
}

export function findStock(symbol: string): Stock | undefined {
  return STOCKS.find((s) => s.symbol === symbol);
}
