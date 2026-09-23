/* Minimal spreadsheet formula engine: A1 references, ranges, operators, common functions. */

export type CellValue = number | string | boolean | null;

export type ErrorValue = { error: string };

export type EvalResult = CellValue | ErrorValue;

export function isErrorValue(value: unknown): value is ErrorValue {
  return typeof value === "object" && value !== null && "error" in (value as Record<string, unknown>);
}

export function columnLabel(index: number): string {
  let label = "";
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
}

export function columnIndex(label: string): number {
  let index = 0;
  for (const char of label.toUpperCase()) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index - 1;
}

export function isFormula(raw: unknown): raw is string {
  return typeof raw === "string" && raw.trimStart().startsWith("=") && raw.trim().length > 1;
}

/* ---------- tokenizer ---------- */

type Token =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "ref"; col: number; row: number }
  | { kind: "name"; value: string }
  | { kind: "op"; value: string }
  | { kind: "punct"; value: string };

const OPERATORS = ["<>", "<=", ">=", "+", "-", "*", "/", "^", "&", "=", "<", ">", "%"];

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const char = input[i]!;
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    if (char === '"') {
      let value = "";
      i += 1;
      while (i < input.length) {
        if (input[i] === '"') {
          if (input[i + 1] === '"') {
            value += '"';
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        value += input[i];
        i += 1;
      }
      tokens.push({ kind: "string", value });
      continue;
    }
    if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(input[i + 1] ?? ""))) {
      const match = /^[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?/.exec(input.slice(i));
      if (!match) throw new Error("#VALUE!");
      tokens.push({ kind: "number", value: Number(match[0]) });
      i += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      const ref = /^\$?([A-Za-z]{1,3})\$?([0-9]{1,7})(?![A-Za-z0-9_.])/.exec(input.slice(i));
      if (ref) {
        tokens.push({ kind: "ref", col: columnIndex(ref[1]!), row: Number(ref[2]) - 1 });
        i += ref[0].length;
        continue;
      }
      const name = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(input.slice(i))!;
      tokens.push({ kind: "name", value: name[0].toUpperCase() });
      i += name[0].length;
      continue;
    }
    const op = OPERATORS.find((candidate) => input.startsWith(candidate, i));
    if (op) {
      tokens.push({ kind: "op", value: op });
      i += op.length;
      continue;
    }
    if ("(),;:".includes(char)) {
      tokens.push({ kind: "punct", value: char === ";" ? "," : char });
      i += 1;
      continue;
    }
    throw new Error("#NAME?");
  }
  return tokens;
}

/* ---------- AST ---------- */

type Node =
  | { type: "literal"; value: CellValue }
  | { type: "ref"; col: number; row: number }
  | { type: "range"; from: { col: number; row: number }; to: { col: number; row: number } }
  | { type: "unary"; op: string; operand: Node }
  | { type: "binary"; op: string; left: Node; right: Node }
  | { type: "call"; name: string; args: Node[] };

function parse(tokens: Token[]): Node {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (kind: Token["kind"], value?: string) => {
    const token = tokens[pos];
    if (!token || token.kind !== kind) return null;
    if (value !== undefined && "value" in token && token.value !== value) return null;
    pos += 1;
    return token;
  };
  const expect = (kind: Token["kind"], value?: string) => {
    const token = eat(kind, value);
    if (!token) throw new Error("#VALUE!");
    return token;
  };

  function parseExpression(): Node {
    let left = parseConcat();
    for (;;) {
      const token = peek();
      if (token?.kind === "op" && ["=", "<>", "<", "<=", ">", ">="].includes(token.value)) {
        pos += 1;
        left = { type: "binary", op: token.value, left, right: parseConcat() };
        continue;
      }
      return left;
    }
  }

  function parseConcat(): Node {
    let left = parseAdditive();
    for (;;) {
      const token = peek();
      if (token?.kind === "op" && token.value === "&") {
        pos += 1;
        left = { type: "binary", op: "&", left, right: parseAdditive() };
        continue;
      }
      return left;
    }
  }

  function parseAdditive(): Node {
    let left = parseTerm();
    for (;;) {
      const token = peek();
      if (token?.kind === "op" && (token.value === "+" || token.value === "-")) {
        pos += 1;
        left = { type: "binary", op: token.value, left, right: parseTerm() };
        continue;
      }
      return left;
    }
  }

  function parseTerm(): Node {
    let left = parseUnary();
    for (;;) {
      const token = peek();
      if (token?.kind === "op" && (token.value === "*" || token.value === "/")) {
        pos += 1;
        left = { type: "binary", op: token.value, left, right: parseUnary() };
        continue;
      }
      return left;
    }
  }

  function parseUnary(): Node {
    const token = peek();
    if (token?.kind === "op" && (token.value === "-" || token.value === "+")) {
      pos += 1;
      return { type: "unary", op: token.value, operand: parseUnary() };
    }
    return parsePower();
  }

  function parsePower(): Node {
    const base = parsePostfix();
    const token = peek();
    if (token?.kind === "op" && token.value === "^") {
      pos += 1;
      return { type: "binary", op: "^", left: base, right: parseUnary() };
    }
    return base;
  }

  function parsePostfix(): Node {
    let node = parsePrimary();
    for (;;) {
      const token = peek();
      if (token?.kind === "op" && token.value === "%") {
        pos += 1;
        node = { type: "binary", op: "/", left: node, right: { type: "literal", value: 100 } };
        continue;
      }
      return node;
    }
  }

  function parsePrimary(): Node {
    const token = peek();
    if (!token) throw new Error("#VALUE!");
    if (token.kind === "number") {
      pos += 1;
      return { type: "literal", value: token.value };
    }
    if (token.kind === "string") {
      pos += 1;
      return { type: "literal", value: token.value };
    }
    if (token.kind === "ref") {
      pos += 1;
      if (eat("punct", ":")) {
        const end = expect("ref") as Extract<Token, { kind: "ref" }>;
        return {
          type: "range",
          from: { col: token.col, row: token.row },
          to: { col: end.col, row: end.row },
        };
      }
      return { type: "ref", col: token.col, row: token.row };
    }
    if (token.kind === "name") {
      pos += 1;
      if (token.value === "TRUE") return { type: "literal", value: true };
      if (token.value === "FALSE") return { type: "literal", value: false };
      if (!eat("punct", "(")) throw new Error("#NAME?");
      const args: Node[] = [];
      if (!eat("punct", ")")) {
        for (;;) {
          args.push(parseExpression());
          if (eat("punct", ",")) continue;
          expect("punct", ")");
          break;
        }
      }
      return { type: "call", name: token.value, args };
    }
    if (token.kind === "punct" && token.value === "(") {
      pos += 1;
      const inner = parseExpression();
      expect("punct", ")");
      return inner;
    }
    throw new Error("#VALUE!");
  }

  const ast = parseExpression();
  if (pos !== tokens.length) throw new Error("#VALUE!");
  return ast;
}

/* ---------- evaluation ---------- */

function toNumber(value: CellValue): number {
  if (value === null || value === "") return 0;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const parsed = Number(String(value).replace(",", "."));
  if (Number.isNaN(parsed)) throw new Error("#VALUE!");
  return parsed;
}

function toText(value: CellValue): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

function flatten(values: (CellValue | CellValue[])[]): CellValue[] {
  return values.flatMap((value) => (Array.isArray(value) ? value : [value]));
}

function numbers(values: (CellValue | CellValue[])[]): number[] {
  return flatten(values)
    .filter((value) => value !== null && value !== "" && typeof value !== "boolean")
    .map((value) => {
      const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
      return Number.isNaN(parsed) ? null : parsed;
    })
    .filter((value): value is number => value !== null);
}

type Args = (CellValue | CellValue[])[];

const FUNCTIONS: Record<string, (args: Args) => CellValue> = {
  SUM: (args) => numbers(args).reduce((total, value) => total + value, 0),
  PRODUCT: (args) => numbers(args).reduce((total, value) => total * value, 1),
  AVERAGE: (args) => {
    const list = numbers(args);
    if (list.length === 0) throw new Error("#DIV/0!");
    return list.reduce((total, value) => total + value, 0) / list.length;
  },
  MIN: (args) => {
    const list = numbers(args);
    return list.length ? Math.min(...list) : 0;
  },
  MAX: (args) => {
    const list = numbers(args);
    return list.length ? Math.max(...list) : 0;
  },
  MEDIAN: (args) => {
    const list = numbers(args).sort((a, b) => a - b);
    if (!list.length) throw new Error("#DIV/0!");
    const mid = Math.floor(list.length / 2);
    return list.length % 2 ? list[mid]! : (list[mid - 1]! + list[mid]!) / 2;
  },
  COUNT: (args) => numbers(args).length,
  COUNTA: (args) => flatten(args).filter((value) => value !== null && value !== "").length,
  COUNTIF: (args) => {
    const [range, criterion] = args;
    const list = Array.isArray(range) ? range : [range ?? null];
    return list.filter((value) => matchesCriterion(value ?? null, criterion as CellValue)).length;
  },
  SUMIF: (args) => {
    const [range, criterion, sumRange] = args;
    const list = Array.isArray(range) ? range : [range ?? null];
    const targets = Array.isArray(sumRange) ? sumRange : list;
    let total = 0;
    list.forEach((value, index) => {
      if (matchesCriterion(value ?? null, criterion as CellValue)) {
        const target = targets[index] ?? null;
        total += numbers([target])[0] ?? 0;
      }
    });
    return total;
  },
  ROUND: (args) => {
    const value = toNumber(single(args[0]));
    const digits = args.length > 1 ? toNumber(single(args[1])) : 0;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  },
  ABS: (args) => Math.abs(toNumber(single(args[0]))),
  SQRT: (args) => {
    const value = toNumber(single(args[0]));
    if (value < 0) throw new Error("#NUM!");
    return Math.sqrt(value);
  },
  POWER: (args) => toNumber(single(args[0])) ** toNumber(single(args[1])),
  INT: (args) => Math.floor(toNumber(single(args[0]))),
  MOD: (args) => {
    const divisor = toNumber(single(args[1]));
    if (divisor === 0) throw new Error("#DIV/0!");
    return toNumber(single(args[0])) % divisor;
  },
  IF: (args) => {
    const condition = single(args[0]);
    const truthy =
      typeof condition === "boolean" ? condition : condition !== null && condition !== "" && condition !== 0;
    return truthy ? (single(args[1]) ?? null) : (single(args[2]) ?? null);
  },
  AND: (args) => flatten(args).every((value) => (typeof value === "boolean" ? value : toNumber(value) !== 0)),
  OR: (args) => flatten(args).some((value) => (typeof value === "boolean" ? value : toNumber(value) !== 0)),
  NOT: (args) => {
    const value = single(args[0]);
    return typeof value === "boolean" ? !value : toNumber(value) === 0;
  },
  CONCAT: (args) => flatten(args).map(toText).join(""),
  CONCATENATE: (args) => flatten(args).map(toText).join(""),
  LEN: (args) => toText(single(args[0])).length,
  UPPER: (args) => toText(single(args[0])).toUpperCase(),
  LOWER: (args) => toText(single(args[0])).toLowerCase(),
  TRIM: (args) => toText(single(args[0])).trim(),
  LEFT: (args) => toText(single(args[0])).slice(0, args.length > 1 ? toNumber(single(args[1])) : 1),
  RIGHT: (args) => {
    const text = toText(single(args[0]));
    const count = args.length > 1 ? toNumber(single(args[1])) : 1;
    return count <= 0 ? "" : text.slice(-count);
  },
  TODAY: () => new Date().toISOString().slice(0, 10),
  NOW: () => new Date().toISOString(),
};

function single(value: CellValue | CellValue[] | undefined): CellValue {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function matchesCriterion(value: CellValue, criterion: CellValue): boolean {
  const text = toText(criterion).trim();
  const comparison = /^(<>|<=|>=|<|>|=)(.*)$/.exec(text);
  if (comparison) {
    const op = comparison[1]!;
    const operand = comparison[2]!.trim();
    const numeric = Number(operand);
    const left = typeof value === "number" ? value : Number(toText(value));
    if (!Number.isNaN(numeric) && !Number.isNaN(left)) {
      if (op === "<") return left < numeric;
      if (op === "<=") return left <= numeric;
      if (op === ">") return left > numeric;
      if (op === ">=") return left >= numeric;
      if (op === "=") return left === numeric;
      return left !== numeric;
    }
    const leftText = toText(value);
    if (op === "=") return leftText === operand;
    if (op === "<>") return leftText !== operand;
    return false;
  }
  return toText(value).toLowerCase() === text.toLowerCase();
}

export type GridSource = {
  /** Raw value stored in the cell (may be a formula string). */
  raw: (row: number, col: number) => unknown;
  rowCount: number;
  colCount: number;
};

/** Evaluates every cell once, resolving references and detecting cycles. */
export function createEvaluator(source: GridSource) {
  const cache = new Map<string, EvalResult>();
  const visiting = new Set<string>();

  function coerceRaw(raw: unknown): CellValue {
    if (raw === undefined || raw === null || raw === "") return null;
    if (typeof raw === "number" || typeof raw === "boolean") return raw;
    const text = String(raw);
    if (text.trim() !== "" && !Number.isNaN(Number(text.trim()))) return Number(text.trim());
    return text;
  }

  function cell(row: number, col: number): EvalResult {
    if (row < 0 || col < 0 || row >= source.rowCount || col >= source.colCount) return null;
    const key = `${row}:${col}`;
    if (cache.has(key)) return cache.get(key)!;
    if (visiting.has(key)) return { error: "#CYCLE!" };
    const raw = source.raw(row, col);
    if (!isFormula(raw)) {
      const value = coerceRaw(raw);
      cache.set(key, value);
      return value;
    }
    visiting.add(key);
    let result: EvalResult;
    try {
      result = evaluateNode(parse(tokenize(raw.trim().slice(1))));
    } catch (error) {
      const message = error instanceof Error ? error.message : "#ERROR!";
      result = { error: message.startsWith("#") ? message : "#ERROR!" };
    }
    visiting.delete(key);
    cache.set(key, result);
    return result;
  }

  function resolve(node: Node): CellValue | CellValue[] {
    if (node.type === "ref") {
      const value = cell(node.row, node.col);
      if (isErrorValue(value)) throw new Error(value.error);
      return value;
    }
    if (node.type === "range") {
      const values: CellValue[] = [];
      const rowStart = Math.min(node.from.row, node.to.row);
      const rowEnd = Math.max(node.from.row, node.to.row);
      const colStart = Math.min(node.from.col, node.to.col);
      const colEnd = Math.max(node.from.col, node.to.col);
      for (let row = rowStart; row <= rowEnd; row += 1) {
        for (let col = colStart; col <= colEnd; col += 1) {
          const value = cell(row, col);
          if (isErrorValue(value)) throw new Error(value.error);
          values.push(value);
        }
      }
      return values;
    }
    return evaluateScalar(node);
  }

  function evaluateScalar(node: Node): CellValue {
    switch (node.type) {
      case "literal":
        return node.value;
      case "ref":
      case "range": {
        const value = resolve(node);
        return Array.isArray(value) ? (value[0] ?? null) : value;
      }
      case "unary": {
        const value = evaluateScalar(node.operand);
        return node.op === "-" ? -toNumber(value) : toNumber(value);
      }
      case "binary": {
        const left = evaluateScalar(node.left);
        const right = evaluateScalar(node.right);
        switch (node.op) {
          case "+":
            return toNumber(left) + toNumber(right);
          case "-":
            return toNumber(left) - toNumber(right);
          case "*":
            return toNumber(left) * toNumber(right);
          case "/": {
            const divisor = toNumber(right);
            if (divisor === 0) throw new Error("#DIV/0!");
            return toNumber(left) / divisor;
          }
          case "^":
            return toNumber(left) ** toNumber(right);
          case "&":
            return toText(left) + toText(right);
          case "=":
            return toText(left) === toText(right);
          case "<>":
            return toText(left) !== toText(right);
          case "<":
            return toNumber(left) < toNumber(right);
          case "<=":
            return toNumber(left) <= toNumber(right);
          case ">":
            return toNumber(left) > toNumber(right);
          case ">=":
            return toNumber(left) >= toNumber(right);
          default:
            throw new Error("#VALUE!");
        }
      }
      case "call": {
        const fn = FUNCTIONS[node.name];
        if (!fn) throw new Error("#NAME?");
        return fn(node.args.map((arg) => resolve(arg)));
      }
      default:
        throw new Error("#VALUE!");
    }
  }

  function evaluateNode(node: Node): EvalResult {
    try {
      return evaluateScalar(node);
    } catch (error) {
      const message = error instanceof Error ? error.message : "#ERROR!";
      return { error: message.startsWith("#") ? message : "#ERROR!" };
    }
  }

  return { cell };
}

export function formatValue(value: EvalResult): string {
  if (isErrorValue(value)) return value.error;
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "#NUM!";
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 1e10) / 1e10);
  }
  return value;
}

export const FUNCTION_NAMES = Object.keys(FUNCTIONS).sort();
