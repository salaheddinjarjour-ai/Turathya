"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// Prisma Client Instance
const client_1 = require("@prisma/client");
// Create a single instance of PrismaClient
const prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
exports.prisma = prisma;
// Handle graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=prisma.js.map