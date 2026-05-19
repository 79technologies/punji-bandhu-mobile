export type Exchange = 'NSE' | 'BSE';

export type Stock = {
  symbol: string;
  name: string;
  exchange: Exchange;
  lastPrice: number; // INR; placeholder until quote API is wired (see api-integration skill)
};

// Instrument as returned by /feed/instruments — no price data
export type Instrument = {
  key: string;      // e.g. "NSE_EQ|RELIANCE"
  symbol: string;
  name: string;
  exchange: Exchange;
};

export type Holding = {
  symbol: string;
  exchange: Exchange;
  quantity: number;
};
