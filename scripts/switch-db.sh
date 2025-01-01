#!/bin/bash

# Check if an argument is provided
if [ -z "$1" ]; then
    echo "Usage: ./switch-db.sh [sqlite|postgres]"
    exit 1
fi

SCHEMA_FILE="prisma/schema.prisma"

# Switch based on argument
case "$1" in
    "sqlite")
        echo "Switching to SQLite..."
        # Update provider in schema file
        sed -i 's/provider = "postgresql"/provider = "sqlite"/' $SCHEMA_FILE
        echo "DATABASE_URL=\"file:./prisma/dev.db\"" > .env.db
        ;;
    "postgres")
        echo "Switching to PostgreSQL..."
        # Update provider in schema file
        sed -i 's/provider = "sqlite"/provider = "postgresql"/' $SCHEMA_FILE
        echo "DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/solana_bot?schema=public\"" > .env.db
        ;;
    *)
        echo "Invalid database type. Use 'sqlite' or 'postgres'"
        exit 1
        ;;
esac

# Update .env file
grep -v "^DATABASE_URL=" .env > .env.tmp
cat .env.tmp .env.db > .env
rm .env.tmp .env.db

echo "Database switched to $1"
echo "Run 'npx prisma generate' and 'npx prisma migrate dev' to update the database" 