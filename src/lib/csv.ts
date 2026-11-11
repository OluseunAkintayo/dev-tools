export const parseCsv = (text: string, delimiter = ","): string[][] => {
  if (delimiter.length !== 1) {
    throw new Error("Delimiter must be a single character.");
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldStarted = false;

  const pushField = () => {
    row.push(field);
    field = "";
    fieldStarted = false;
  };

  const pushRow = () => {
    pushField();
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && !fieldStarted) {
      inQuotes = true;
      fieldStarted = true;
    } else if (char === delimiter) {
      pushField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      pushRow();
    } else {
      field += char;
      fieldStarted = true;
    }
  }

  if (inQuotes) {
    throw new Error("Invalid CSV: a quoted field is missing its closing quote.");
  }

  if (field !== "" || fieldStarted || row.length > 0) pushRow();

  return rows;
};

export const csvToObjects = (text: string, delimiter = ","): Record<string, string>[] => {
  const [headers, ...rows] = parseCsv(text, delimiter);
  if (!headers) throw new Error("The CSV data is empty.");

  return rows.map((values) =>
    headers.reduce<Record<string, string>>((obj, header, index) => {
      obj[header] = values[index] ?? "";
      return obj;
    }, {})
  );
};

export const escapeCsvValue = (value: string, delimiter = ","): string => {
  if (value.includes(delimiter) || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const toCsv = (headers: string[], rows: string[][], delimiter = ","): string =>
  [headers, ...rows].map((row) => row.map((value) => escapeCsvValue(value, delimiter)).join(delimiter)).join("\n");
