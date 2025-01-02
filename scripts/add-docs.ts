/**
 * @file Documentation header addition script
 * @version 1.0.0
 * @module scripts/add-docs
 * @author Development Team
 * @lastModified 2024-01-02
 */

import { glob } from "glob";
import { readFile, writeFile } from "fs/promises";
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
    name: "param_tag",
    pattern: /@param\s+\{\w+\}\s+\w+\s+-\s+.+/,
    message: "Missing or invalid @param tag",
  },
  {
    name: "returns_tag",
    pattern: /@returns\s+\{\w+\}\s+.+/,
    message: "Missing or invalid @returns tag",
  },
];

interface FileInfo {
  path: string;
  content: string;
  type: "component" | "test" | "type" | "service" | "util" | "route";
}

function determineFileType(filePath: string): FileInfo["type"] {
  if (filePath.includes("__tests__") || filePath.endsWith(".test.ts"))
    return "test";
  if (filePath.includes("/components/")) return "component";
  if (filePath.includes("/types/")) return "type";
  if (filePath.includes("/services/")) return "service";
  if (filePath.includes("/utils/")) return "util";
  if (filePath.includes("/routes/")) return "route";
  return "util";
}

function generateFileHeader(file: FileInfo): string {
  const modulePath = file.path.replace(/^src\//, "").replace(/\.[^/.]+$/, "");
  const description = (() => {
    switch (file.type) {
      case "component":
        return "Svelte component for handling UI functionality";
      case "test":
        return "Test suite for validating functionality";
      case "type":
        return "TypeScript type definitions and interfaces";
      case "service":
        return "Service implementation for business logic";
      case "util":
        return "Utility functions and helpers";
      case "route":
        return "API route handler for HTTP endpoints";
      default:
        return "Implementation file";
    }
  })();

  return `/**
 * @file ${description}
 * @version 1.0.0
 * @module ${modulePath}
 * @author Development Team
 * @lastModified ${new Date().toISOString().split("T")[0]}
 */\n\n`;
}

async function processFile(filePath: string): Promise<void> {
  const content = await readFile(filePath, "utf-8");

  // Skip if file already has documentation header
  if (content.includes("@file") && content.includes("@module")) {
    console.log(chalk.blue(`✓ ${filePath} already documented`));
    return;
  }

  const fileInfo: FileInfo = {
    path: filePath,
    content,
    type: determineFileType(filePath),
  };

  const header = generateFileHeader(fileInfo);
  const newContent = header + content.replace(/^\s*\/\*\*[\s\S]*?\*\/\s*/m, "");

  await writeFile(filePath, newContent, "utf-8");
  console.log(chalk.green(`✓ Added documentation to ${filePath}`));
}

// Main function
const files = await glob("src/**/*.{ts,tsx,svelte}");
let processedCount = 0;

console.log(chalk.blue("\nAdding documentation headers to files...\n"));

for (const file of files) {
  await processFile(file);
  processedCount++;
}

console.log(chalk.green(`\n✓ Processed ${processedCount} files`));
console.log(chalk.blue("\nRunning validation to verify changes...\n"));

// Run validation
const files2 = await glob("src/**/*.{ts,tsx,svelte}");
let allValid = true;

for (const file of files2) {
  const content = await readFile(file, "utf-8");
  const fileType = file.split(".").pop();
  let validationResult = true;

  console.log(chalk.blue(`\nValidating ${file}`));

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
  const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)/g) || [];
  functionMatches.forEach((func) => {
    const hasValidDocs = FUNCTION_RULES.every((rule) => {
      const isValid = rule.pattern.test(content);
      if (!isValid) {
        console.log(
          chalk.red(`❌ ${rule.message} for function: ${func.trim()}`),
        );
      }
      return isValid;
    });
    validationResult = validationResult && hasValidDocs;
  });

  if (validationResult) {
    console.log(chalk.green("✓ All documentation rules passed"));
  }

  allValid = allValid && validationResult;
}

if (!allValid) {
  console.log(chalk.red("\n❌ Documentation validation failed"));
  process.exit(1);
}

console.log(chalk.green("\n✓ All files passed documentation validation"));
