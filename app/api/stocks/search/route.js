import { NextResponse } from 'next/server';

// Using Alpha Vantage API for stock search
// You can get a free API key from https://www.alphavantage.co/support/#api-key
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    // First, try to search using Alpha Vantage symbol search
    const searchUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${ALPHA_VANTAGE_API_KEY}`;

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data['Error Message'] || data['Note']) {
      // If API limit reached or error, return mock data for demo
      return NextResponse.json({
        success: true,
        results: getMockSearchResults(query),
      });
    }

    if (data.bestMatches && data.bestMatches.length > 0) {
      const results = data.bestMatches.slice(0, 10).map((match) => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        exchange: match['4. region'] || 'US',
        type: match['3. type'],
      }));

      // Get current prices for each result
      const resultsWithPrices = await Promise.all(
        results.map(async (stock) => {
          try {
            const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stock.symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
            const quoteResponse = await fetch(quoteUrl);
            const quoteData = await quoteResponse.json();

            if (quoteData['Global Quote'] && quoteData['Global Quote']['05. price']) {
              const price = parseFloat(quoteData['Global Quote']['05. price']);
              const change = parseFloat(quoteData['Global Quote']['09. change'] || 0);
              const changePercent = parseFloat(quoteData['Global Quote']['10. change percent']?.replace('%', '') || 0);

              return {
                ...stock,
                price,
                change,
                changePercent,
              };
            }
          } catch (error) {
            console.error(`Error fetching quote for ${stock.symbol}:`, error);
          }
          return stock;
        })
      );

      return NextResponse.json({
        success: true,
        results: resultsWithPrices.filter((r) => r.price !== undefined),
      });
    }

    // If no results, return mock data for demo
    return NextResponse.json({
      success: true,
      results: getMockSearchResults(query),
    });
  } catch (error) {
    console.error('Error searching stocks:', error);
    // Return mock data as fallback
    return NextResponse.json({
      success: true,
      results: getMockSearchResults(query),
    });
  }
}

function getMockSearchResults(query) {
  const mockStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', price: 175.43, change: 2.15, changePercent: 1.24 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', price: 378.85, change: -1.23, changePercent: -0.32 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', price: 142.56, change: 0.89, changePercent: 0.63 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', price: 151.94, change: -0.45, changePercent: -0.30 },
    { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', price: 248.50, change: 5.20, changePercent: 2.14 },
    { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', price: 485.39, change: 3.12, changePercent: 0.65 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', price: 875.28, change: 12.45, changePercent: 1.44 },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', price: 195.67, change: -0.78, changePercent: -0.40 },
    { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', price: 275.34, change: 1.23, changePercent: 0.45 },
    { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', price: 162.45, change: 0.56, changePercent: 0.35 },
  ];

  const queryLower = query.toLowerCase();
  return mockStocks
    .filter((stock) =>
      stock.symbol.toLowerCase().includes(queryLower) ||
      stock.name.toLowerCase().includes(queryLower)
    )
    .slice(0, 10);
}

