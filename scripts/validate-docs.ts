/**
 * @file Documentation validation script
 * @version 1.0.0
 * @module scripts/validate-docs
 * @author Development Team
 * @lastModified 2024-01-02
 */

import { glob } from "glob";
import { readFile } from "fs/promises";
import chalk from "chalk";

interface ValidationRule {
  name: string;
  pattern: RegExp;
  message: string;
}

const FILE_HEADER_RULES: ValidationRule[] = [
  {
    name: "file_tag",
    pattern: /@file\s+.+/,
    message: "Missing or invalid @file tag",
  },
  {
    name: "version_tag",
    pattern: /@version\s+\d+\.\d+\.\d+/,
    message: "Missing or invalid @version tag",
  },
  {
    name: "module_tag",
    pattern: /@module\s+.+/,
    message: "Missing or invalid @module tag",
  },
  {
    name: "author_tag",
    pattern: /@author\s+.+/,
    message: "Missing or invalid @author tag",
  },
  {
    name: "lastModified_tag",
    pattern: /@lastModified\s+\d{4}-\d{2}-\d{2}/,
    message: "Missing or invalid @lastModified tag",
  },
];

const COMPONENT_RULES: ValidationRule[] = [
  {
    name: "component_tag",
    pattern: /@component\s+\w+/,
    message: "Missing or invalid @component tag",
  },
  {
    name: "description_tag",
    pattern: /@description\s+.+/,
    message: "Missing or invalid @description tag",
  },
];

const FUNCTION_RULES: ValidationRule[] = [
  {
    name: "function_tag",
    pattern: /@function\s+\w+/,
    message: "Missing or invalid @function tag",
  },
  {
    name: "description_tag",
    pattern: /@description\s+.+/,
    message: "Missing or invalid @description tag",
  },
];

function findDocBlock(content: string, startIndex: number): string | null {
  // Split content into lines up to startIndex
  const lines = content.slice(0, startIndex).split("\n");

  // Find the last JSDoc block
  let blockStart = -1;
  let blockEnd = -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();

    if (line === "*/") {
      blockEnd = i;
    } else if (line === "/**" && blockEnd !== -1) {
      blockStart = i;
      break;
    }
  }

  if (blockStart === -1 || blockEnd === -1) {
    return null;
  }

  // Get the lines between start and end
  const docLines = lines.slice(blockStart, blockEnd + 1);

  // Check if there's only whitespace or export statements between the doc block and the function
  const afterDoc = lines.slice(blockEnd + 1);
  const hasOnlyWhitespaceOrExport = afterDoc.every((line) => {
    const trimmed = line.trim();
    return !trimmed || trimmed.startsWith("export");
  });

  if (!hasOnlyWhitespaceOrExport) {
    return null;
  }

  return docLines.join("\n");
}

function parseType(type: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < type.length; i++) {
    const char = type[i];
    if (char === "<" || char === "(") {
      depth++;
    } else if (char === ">" || char === ")") {
      depth--;
    } else if (char === "," && depth === 0) {
      if (current) parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current) parts.push(current.trim());

  return parts.map((part) => part.trim());
}

function normalizeType(type: string): string {
  // Remove spaces and newlines
  const normalized = type.replace(/\s+/g, "");

  // Handle Promise types
  if (normalized.startsWith("Promise<")) {
    const inner = normalized.slice(8, -1);
    return normalizeType(inner);
  }

  // Handle arrays
  if (normalized.endsWith("[]")) {
    return `Array_${normalizeType(normalized.slice(0, -2))}`;
  }

  // Handle union types
  if (normalized.includes("|")) {
    const types = parseType(normalized);
    return types
      .map((t) => normalizeType(t))
      .sort()
      .join("Or");
  }

  // Handle intersection types
  if (normalized.includes("&")) {
    const types = parseType(normalized);
    return types
      .map((t) => normalizeType(t))
      .sort()
      .join("And");
  }

  // Handle generic types
  if (normalized.includes("<")) {
    const base = normalized.slice(0, normalized.indexOf("<"));
    const params = normalized.slice(
      normalized.indexOf("<") + 1,
      normalized.lastIndexOf(">"),
    );
    const paramTypes = parseType(params);
    return `${base}_${paramTypes.map((t) => normalizeType(t)).join("_")}`;
  }

  return normalized;
}

function typesMatch(docType: string, actualType: string): boolean {
  const normalizedDoc = normalizeType(docType);
  const normalizedActual = normalizeType(actualType);

  // Handle void/undefined equivalence
  if (
    (normalizedDoc === "void" && normalizedActual === "undefined") ||
    (normalizedDoc === "undefined" && normalizedActual === "void")
  ) {
    return true;
  }

  return normalizedDoc === normalizedActual;
}

function parseParameters(paramsStr: string): string[] {
  const params: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < paramsStr.length; i++) {
    const char = paramsStr[i];
    if (char === "<" || char === "{" || char === "(") {
      depth++;
    } else if (char === ">" || char === "}" || char === ")") {
      depth--;
    } else if (char === "," && depth === 0) {
      if (current) params.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current) params.push(current.trim());

  return params.filter((p) => p !== "");
}

function validateFunctionDoc(
  content: string,
  functionMatch: string,
  startIndex: number,
): boolean {
  // Find the JSDoc comment block before the function
  const docBlock = findDocBlock(content, startIndex);
  if (!docBlock) {
    console.log(chalk.red("No documentation block found"));
    return false;
  }

  // Check basic function documentation
  const hasBasicDocs = FUNCTION_RULES.every((rule) => {
    const isValid = rule.pattern.test(docBlock);
    if (!isValid) {
      console.log(chalk.red(`Missing ${rule.name}`));
    }
    return isValid;
  });
  if (!hasBasicDocs) return false;

  // Extract parameters
  const funcSignature = functionMatch.replace(/\s+/g, " ").trim();
  const funcMatch = funcSignature.match(
    /(?:export\s+)?(?:async\s+)?function\s+\w+\s*\((.*?)\)/,
  );
  if (!funcMatch) {
    console.log(chalk.red("Could not parse function signature"));
    console.log(chalk.red(`Signature: ${funcSignature}`));
    return false;
  }

  const [, paramsStr] = funcMatch;
  const params = parseParameters(paramsStr);

  // Check parameters
  const hasAllParams = params.every((param) => {
    const paramParts = param.split(":")[0].trim().split("=");
    const paramName = paramParts[0].trim();
    const paramPattern = new RegExp(`@param\\s*{[^}]+}\\s*${paramName}\\s*-`);
    const hasParam = paramPattern.test(docBlock);
    if (!hasParam) {
      console.log(
        chalk.red(
          `Missing or invalid documentation for parameter: ${paramName}`,
        ),
      );
    }
    return hasParam;
  });

  // Check return type
  const returnTypeMatch = functionMatch.match(/\):\s*([^{]+)/);
  if (returnTypeMatch) {
    const actualType = returnTypeMatch[1].trim();
    const docReturnMatch = docBlock.match(/@returns\s*{([^}]+)}/);

    if (!docReturnMatch) {
      console.log(chalk.red("Missing @returns tag"));
      return false;
    }

    const docType = docReturnMatch[1].trim();
    console.log(chalk.blue("Type comparison:"));
    console.log(
      chalk.blue(`  Actual: ${actualType} -> ${normalizeType(actualType)}`),
    );
    console.log(
      chalk.blue(`  Doc:    ${docType} -> ${normalizeType(docType)}`),
    );

    if (!typesMatch(docType, actualType)) {
      console.log(chalk.yellow(`⚠️  Return type mismatch in documentation:`));
      console.log(chalk.yellow(`   Expected: ${actualType}`));
      console.log(chalk.yellow(`   Got: ${docType}`));
      return false;
    }
  }

  const hasReturnDoc = docBlock.includes("@returns");
  if (!hasReturnDoc) {
    console.log(chalk.red("Missing @returns documentation"));
    return false;
  }

  return hasAllParams && hasReturnDoc;
}

async function validateFile(filePath: string): Promise<boolean> {
  const content = await readFile(filePath, "utf-8");
  const fileType = filePath.split(".").pop();
  let validationResult = true;

  console.log(chalk.blue(`\nValidating ${filePath}`));

  // Check file header
  validationResult = FILE_HEADER_RULES.every((rule) => {
    const isValid = rule.pattern.test(content);
    if (!isValid) {
      console.log(chalk.red(`❌ ${rule.message}`));
    }
    return isValid;
  });

  // Check components (for .svelte files)
  if (fileType === "svelte") {
    const hasComponentDocs = COMPONENT_RULES.every((rule) => {
      const isValid = rule.pattern.test(content);
      if (!isValid) {
        console.log(chalk.red(`❌ ${rule.message}`));
      }
      return isValid;
    });
    validationResult = validationResult && hasComponentDocs;
  }

  // Check functions
  let match;
  const functionRegex =
    /(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)[^{]*{/g;
  while ((match = functionRegex.exec(content)) !== null) {
    const isValid = validateFunctionDoc(content, match[0], match.index);
    if (!isValid) {
      console.log(
        chalk.red(
          `❌ Missing or invalid documentation for function: ${match[0].trim()}`,
        ),
      );
      validationResult = false;
    }
  }

  if (validationResult) {
    console.log(chalk.green("✅ All documentation rules passed"));
  }

  return validationResult;
}

// Main function
const files = await glob("src/**/*.{ts,tsx,svelte}");
let allValid = true;

for (const file of files) {
  const isValid = await validateFile(file);
  allValid = allValid && isValid;
}

if (!allValid) {
  console.log(chalk.red("\n❌ Documentation validation failed"));
  process.exit(1);
}

console.log(chalk.green("\n✅ All files passed documentation validation"));
