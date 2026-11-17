export type DelimiterChoice = "," | ";" | "\t" | "|" | "custom";

export const DELIMITER_OPTIONS: { value: DelimiterChoice; label: string }[] = [
  { value: ",", label: "Comma" },
  { value: ";", label: "Semicolon" },
  { value: "\t", label: "Tab" },
  { value: "|", label: "Pipe" },
  { value: "custom", label: "Other" },
];

export const initialChoice = (delimiter?: string): DelimiterChoice =>
  delimiter && DELIMITER_OPTIONS.some((option) => option.value === delimiter) ? (delimiter as DelimiterChoice) : ",";
