const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const GROUPS = ["", "Thousand", "Million", "Billion"];

function threeDigitsToWords(n: number): string {
  let str = "";
  if (n >= 100) {
    str += `${ONES[Math.floor(n / 100)]} Hundred`;
    n %= 100;
    if (n > 0) str += " ";
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)];
    if (n % 10 > 0) str += `-${ONES[n % 10]}`;
  } else if (n > 0) {
    str += ONES[n];
  }
  return str;
}

function integerToWords(n: number): string {
  if (n === 0) return "Zero";
  const words: string[] = [];
  let groupIndex = 0;
  while (n > 0) {
    const group = n % 1000;
    if (group > 0) {
      const groupWords = threeDigitsToWords(group) + (GROUPS[groupIndex] ? ` ${GROUPS[groupIndex]}` : "");
      words.unshift(groupWords);
    }
    n = Math.floor(n / 1000);
    groupIndex++;
  }
  return words.join(" ");
}

export function amountInWordsAed(amount: number): string {
  const dirhams = Math.floor(amount);
  const fils = Math.round((amount - dirhams) * 100);
  let result = `${integerToWords(dirhams)} Dirham${dirhams === 1 ? "" : "s"}`;
  if (fils > 0) {
    result += ` and ${integerToWords(fils)} Fils`;
  }
  return `${result} Only`;
}
