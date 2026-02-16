
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    try {
        const specificStoreId = '84735106-44fe-407a-bb02-2a66223c2881';
        console.log(`Checking Store: ${specificStoreId}`);

        const store = await prisma.store.findUnique({ where: { id: specificStoreId } });
        console.log('Store Exists:', !!store);

        if (store) {
            const members = await prisma.storeMember.findMany({
                where: { storeId: specificStoreId },
                include: { user: true }
            });
            console.log('Members in this store:', members.length);
            members.forEach(m => console.log(`- ${m.user.email} (${m.role})`));

            if (members.length === 0) {
                console.log("Store exists but has no members. This is the bug.");
                // We should add the current user as owner if possible?
                // But we don't know who the current user is from here, unless we query likely candidates.
            }
        } else {
            // Check if there are ANY stores
            const allStores = await prisma.store.findMany({ take: 5 });
            console.log('Other Stores found:', allStores.map(s => `${s.id} (${s.name})`));
        }
    } catch (e) {
        console.error(e);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
