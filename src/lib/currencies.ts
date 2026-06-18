export type Currency = { code: string; name: string; symbol?: string; /** 1 USD = usdRate units of this currency (approximate, 2026). */ usdRate: number };

export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", usdRate: 1 },
  { code: "EUR", name: "Euro", symbol: "€", usdRate: 0.92 },
  { code: "GBP", name: "British Pound", symbol: "£", usdRate: 0.79 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", usdRate: 155 },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr", usdRate: 0.88 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", usdRate: 1.37 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", usdRate: 1.52 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", usdRate: 1.66 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", usdRate: 7.2 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", usdRate: 7.8 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", usdRate: 1.34 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", usdRate: 84 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", usdRate: 3.67 },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", usdRate: 3.75 },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", usdRate: 3.64 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", usdRate: 0.31 },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب", usdRate: 0.38 },
  { code: "OMR", name: "Omani Rial", symbol: "﷼", usdRate: 0.38 },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", usdRate: 3.7 },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", usdRate: 34 },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", usdRate: 48 },
  { code: "ZAR", name: "South African Rand", symbol: "R", usdRate: 18 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", usdRate: 1600 },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", usdRate: 15 },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", usdRate: 129 },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", usdRate: 3700 },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", usdRate: 2650 },
  { code: "MAD", name: "Moroccan Dirham", symbol: "د.م.", usdRate: 10 },
  { code: "DZD", name: "Algerian Dinar", symbol: "د.ج", usdRate: 134 },
  { code: "TND", name: "Tunisian Dinar", symbol: "د.ت", usdRate: 3.1 },
  { code: "XOF", name: "West African CFA Franc", symbol: "CFA", usdRate: 605 },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", usdRate: 605 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", usdRate: 5.7 },
  { code: "MXN", name: "Mexican Peso", symbol: "Mex$", usdRate: 20 },
  { code: "ARS", name: "Argentine Peso", symbol: "$", usdRate: 1000 },
  { code: "CLP", name: "Chilean Peso", symbol: "$", usdRate: 950 },
  { code: "COP", name: "Colombian Peso", symbol: "$", usdRate: 4200 },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/", usdRate: 3.75 },
  { code: "VES", name: "Venezuelan Bolívar", symbol: "Bs", usdRate: 45 },
  { code: "UYU", name: "Uruguayan Peso", symbol: "$U", usdRate: 40 },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", usdRate: 95 },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴", usdRate: 41 },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", usdRate: 4 },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", usdRate: 23 },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", usdRate: 370 },
  { code: "RON", name: "Romanian Leu", symbol: "lei", usdRate: 4.6 },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв", usdRate: 1.8 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", usdRate: 10.7 },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", usdRate: 10.9 },
  { code: "DKK", name: "Danish Krone", symbol: "kr", usdRate: 6.9 },
  { code: "ISK", name: "Icelandic Krona", symbol: "kr", usdRate: 138 },
  { code: "KRW", name: "South Korean Won", symbol: "₩", usdRate: 1380 },
  { code: "TWD", name: "Taiwan Dollar", symbol: "NT$", usdRate: 32 },
  { code: "THB", name: "Thai Baht", symbol: "฿", usdRate: 35 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", usdRate: 15800 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", usdRate: 4.7 },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", usdRate: 58 },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", usdRate: 25000 },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", usdRate: 278 },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", usdRate: 119 },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", usdRate: 295 },
  { code: "NPR", name: "Nepalese Rupee", symbol: "₨", usdRate: 134 },
  { code: "AFN", name: "Afghan Afghani", symbol: "؋", usdRate: 70 },
  { code: "IQD", name: "Iraqi Dinar", symbol: "ع.د", usdRate: 1310 },
  { code: "JOD", name: "Jordanian Dinar", symbol: "د.ا", usdRate: 0.71 },
  { code: "LBP", name: "Lebanese Pound", symbol: "ل.ل", usdRate: 89500 },
  { code: "SYP", name: "Syrian Pound", symbol: "£S", usdRate: 13000 },
  { code: "YER", name: "Yemeni Rial", symbol: "﷼", usdRate: 250 },
  { code: "KZT", name: "Kazakhstani Tenge", symbol: "₸", usdRate: 490 },
  { code: "UZS", name: "Uzbekistani Som", symbol: "сум", usdRate: 12700 },
  { code: "AZN", name: "Azerbaijani Manat", symbol: "₼", usdRate: 1.7 },
  { code: "GEL", name: "Georgian Lari", symbol: "₾", usdRate: 2.7 },
  { code: "AMD", name: "Armenian Dram", symbol: "֏", usdRate: 390 },
];

export function getCurrency(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function fromUsd(usd: number, code: string): number {
  return usd * getCurrency(code).usdRate;
}

export function formatMoney(amount: number, code: string): string {
  const c = getCurrency(code);
  const sym = c.symbol ?? "";
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  // Big-denomination currencies: integer; small: 2dp
  const decimals = c.usdRate >= 100 ? 0 : 2;
  const formatted = abs.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return sym ? `${sign}${sym}${formatted}` : `${sign}${formatted} ${c.code}`;
}
