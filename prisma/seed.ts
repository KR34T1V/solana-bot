import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/server/auth.js';

const prisma = new PrismaClient();

async function main() {
    // Create test user
    const hashedPassword = await hashPassword('test123');
    const user = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
            email: 'test@example.com',
            password: hashedPassword,
        },
    });

    console.log('Created test user:', user);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 