"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultTenantName = process.env.SEED_TENANT_NAME ?? 'Default Tenant';
const defaultTenantSlug = process.env.SEED_TENANT_SLUG ?? 'default';
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@erp.com';
const adminName = process.env.SEED_ADMIN_NAME ?? 'System Admin';
const recreateSupabaseAuth = process.env.SEED_RECREATE_SUPABASE_AUTH?.toLowerCase() === 'true';
const seedPlatformAdmin = process.env.SEED_PLATFORM_ADMIN?.toLowerCase() !== 'false';
const allowInsecureSeedDefaults = process.env.SEED_ALLOW_INSECURE_DEFAULTS?.toLowerCase() === 'true';
const isLocalEnvironment = (process.env.NODE_ENV ?? 'development').toLowerCase() !== 'production';
const fallbackAdminPassword = 'AdminPassword123!';
function resolveAdminPassword() {
    if (process.env.SEED_ADMIN_PASSWORD) {
        return process.env.SEED_ADMIN_PASSWORD;
    }
    if (isLocalEnvironment && allowInsecureSeedDefaults) {
        console.warn(`[seed] Using the local fallback admin password for ${adminEmail}. Set SEED_ADMIN_PASSWORD to override it.`);
        return fallbackAdminPassword;
    }
    throw new Error('SEED_ADMIN_PASSWORD is required to seed the admin user. For local-only bootstrap, set SEED_ALLOW_INSECURE_DEFAULTS=true to opt into the built-in development password.');
}
const adminPassword = resolveAdminPassword();
function getSupabaseAdminHeaders() {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to seed Supabase auth users.');
    }
    return {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
    };
}
async function supabaseAdminRequest(path, init) {
    const response = await fetch(`${supabaseUrl}${path}`, {
        ...init,
        headers: {
            ...getSupabaseAdminHeaders(),
            ...(init?.headers ?? {}),
        },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Supabase admin request failed (${response.status} ${response.statusText}): ${text}`);
    }
    if (response.status === 204) {
        return undefined;
    }
    return (await response.json());
}
async function findSupabaseAuthUserByEmail(email) {
    const existingUsers = await prisma.$queryRaw `
    SELECT id::text
    FROM auth.users
    WHERE email = ${email}
    LIMIT 1
  `;
    return existingUsers[0]?.id ?? null;
}
async function deleteSupabaseAuthUser(userId) {
    await supabaseAdminRequest(`/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
    });
}
async function createSupabaseAuthUser(email, password, name, tenantId) {
    const result = await supabaseAdminRequest('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
            email,
            password,
            email_confirm: true,
            user_metadata: { name, tenantId },
        }),
    });
    return result.id;
}
async function ensureSupabaseAuthUser(email, password, name, tenantId) {
    const existingUserId = await findSupabaseAuthUserByEmail(email);
    if (existingUserId && recreateSupabaseAuth) {
        await deleteSupabaseAuthUser(existingUserId);
    }
    else if (existingUserId) {
        return existingUserId;
    }
    return createSupabaseAuthUser(email, password, name, tenantId);
}
async function main() {
    console.log('Seeding database...');
    const tenant = await prisma.tenant.upsert({
        where: { slug: defaultTenantSlug },
        update: {
            name: defaultTenantName,
            status: 'ACTIVE',
        },
        create: {
            name: defaultTenantName,
            slug: defaultTenantSlug,
            status: 'ACTIVE',
        },
    });
    for (const role of Object.values(client_1.UserRole)) {
        await prisma.role.upsert({
            where: { name: role },
            update: {},
            create: { name: role },
        });
    }
    const supabaseAuthUserId = await ensureSupabaseAuthUser(adminEmail, adminPassword, adminName, tenant.id);
    const existingAppUser = await prisma.user.findUnique({
        where: { email: adminEmail },
        select: { id: true },
    });
    if (existingAppUser && existingAppUser.id !== supabaseAuthUserId) {
        await prisma.user.delete({
            where: { email: adminEmail },
        });
    }
    await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            tenantId: tenant.id,
            name: adminName,
            isPlatformAdmin: seedPlatformAdmin,
            roles: {
                set: [],
                connect: [{ name: client_1.UserRole.ADMIN }],
            },
        },
        create: {
            id: supabaseAuthUserId,
            tenantId: tenant.id,
            email: adminEmail,
            name: adminName,
            isPlatformAdmin: seedPlatformAdmin,
            roles: {
                connect: [{ name: client_1.UserRole.ADMIN }],
            },
        },
    });
    console.log(`Seeded tenant: ${tenant.name} (${tenant.slug})`);
    console.log(`Seeded Supabase auth user: ${adminEmail}`);
    console.log('Seeding finished successfully.');
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map