#!/bin/bash

# Get staged files (excluding deletions)
staged_files=$(git diff --cached --name-only --diff-filter=ACMR)

# Initialize test patterns array
test_patterns=()
direct_test_files=()

# Process each staged file
for file in $staged_files; do
  # Handle test files directly
  if [[ $file =~ \.(test|spec)\.(ts|js)$ ]]; then
    direct_test_files+=("$file")
    continue
  fi

  # Only process .ts and .js files
  if [[ $file =~ \.(ts|js)$ ]]; then
    # Get the directory and base name without extension
    dir=$(dirname "$file")
    base=$(basename "$file" | cut -f 1 -d '.')
    
    # Add patterns for different test file locations
    test_patterns+=("$dir/$base.(test|spec).(ts|js)")  # Same directory
    test_patterns+=("$dir/__tests__/$base.(test|spec).(ts|js)")  # __tests__ directory
    test_patterns+=("$dir/tests/$base.(test|spec).(ts|js)")  # tests directory
    
    # If file is a service, also test files that use it
    if [[ $file =~ services/.+\.ts$ ]]; then
      service_name=$(basename "$file" .ts)
      # Find all test files that import this service
      related_tests=$(grep -l "from.*$service_name" $(find src -name "*.test.ts" -o -name "*.spec.ts") 2>/dev/null || true)
      if [ ! -z "$related_tests" ]; then
        while IFS= read -r test_file; do
          test_patterns+=("$test_file")
        done <<< "$related_tests"
      fi
    fi
  fi
done

# Combine direct test files and patterns
all_patterns=()
for file in "${direct_test_files[@]}"; do
  all_patterns+=("$file")
done
for pattern in "${test_patterns[@]}"; do
  all_patterns+=("$pattern")
done

# If we have no tests to run, exit
if [ ${#all_patterns[@]} -eq 0 ]; then
  echo "No relevant test files found for staged changes."
  exit 0
fi

# Join patterns with |
pattern=$(printf "%s|" "${all_patterns[@]}" | sed 's/|$//')
echo "Running tests matching pattern: $pattern"

# Ensure coverage directory exists
mkdir -p coverage/.tmp

# Run tests with coverage
yarn vitest run "$pattern" --passWithNoTests --coverage

# Check the exit code
exit_code=$?
if [ $exit_code -ne 0 ]; then
  echo "Tests failed. Please fix the failing tests before committing."
  exit $exit_code
fi 