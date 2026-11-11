const INDENT = "  ";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const formatKey = (key: string) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key));

const objectType = (obj: Record<string, unknown>, depth: number): string => {
  const entries = Object.entries(obj);
  if (entries.length === 0) return "Record<string, unknown>";
  const pad = INDENT.repeat(depth + 1);
  const lines = entries.map(([key, value]) => `${pad}${formatKey(key)}: ${getType(value, depth + 1)};`);
  return `{\n${lines.join("\n")}\n${INDENT.repeat(depth)}}`;
};

const arrayType = (arr: unknown[], depth: number): string => {
  const types = [...new Set(arr.map((item) => getType(item, depth)))];
  if (types.length === 0) return "unknown[]";
  if (types.length === 1) {
    const [type] = types;
    return /^[\w$.<>[\]]+$/.test(type) ? `${type}[]` : `Array<${type}>`;
  }
  return `Array<${types.join(" | ")}>`;
};

const getType = (value: unknown, depth: number): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return arrayType(value, depth);
  if (isPlainObject(value)) return objectType(value, depth);
  return typeof value;
};

export const toTypeName = (name: string): string =>
  name
    .split(/[^A-Za-z0-9_$]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
    .replace(/^[0-9]+/, "");

export const generateInterface = (data: unknown, name: string): string => {
  const typeName = toTypeName(name);
  if (!typeName) throw new Error("Interface name must contain at least one letter.");

  const root = Array.isArray(data) && data.length > 0 && data.every(isPlainObject) ? data[0] : data;

  if (isPlainObject(root)) {
    return `interface ${typeName} ${objectType(root, 0)}`;
  }
  return `type ${typeName} = ${getType(root, 0)};`;
};
