#!/bin/bash

# Get staged files (excluding deletions)
staged_files=$(git diff --cached --name-only --diff-filter=ACMR)

# Initialize test patterns array
test_patterns=()

# Process each staged file
for file in $staged_files; do
  # Skip test files themselves
  if [[ $file == *".test."* ]] || [[ $file == *".spec."* ]]; then
    continue
  fi

  # Only process .ts and .js files
  if [[ $file == *.ts ]] || [[ $file == *.js ]]; then
    # Get the base name without extension
    base="${file%.*}"
    # Add the test pattern
    test_patterns+=("$base.(test|spec).${file##*.}")
  fi
done

# If we have test patterns, run the tests
if [ ${#test_patterns[@]} -eq 0 ]; then
  echo "No relevant test files found for staged changes."
  exit 0
fi

# Join patterns with |
pattern=$(IFS="|"; echo "${test_patterns[*]}")
echo "Running tests matching pattern: $pattern"

# Run tests
yarn vitest run "$pattern" --passWithNoTests 