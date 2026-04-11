import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultTenantName = process.env.SEED_TENANT_NAME ?? 'Default Tenant';
const defaultTenantSlug = process.env.SEED_TENANT_SLUG ?? 'default';
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@erp.com';
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'AdminPassword123!';
const adminName = process.env.SEED_ADMIN_NAME ?? 'System Admin';
const recreateSupabaseAuth =
  process.env.SEED_RECREATE_SUPABASE_AUTH?.toLowerCase() === 'true';
const seedPlatformAdmin =
  process.env.SEED_PLATFORM_ADMIN?.toLowerCase() !== 'false';

function getSupabaseAdminHeaders() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to seed Supabase auth users.',
    );
  }

  return {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    'Content-Type': 'application/json',
  };
}

async function supabaseAdminRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      ...getSupabaseAdminHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Supabase admin request failed (${response.status} ${response.statusText}): ${text}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function findSupabaseAuthUserByEmail(email: string) {
  const existingUsers = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id::text
    FROM auth.users
    WHERE email = ${email}
    LIMIT 1
  `;

  return existingUsers[0]?.id ?? null;
}

async function deleteSupabaseAuthUser(userId: string) {
  await supabaseAdminRequest<void>(`/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

async function createSupabaseAuthUser(
  email: string,
  password: string,
  name: string,
  tenantId: string,
) {
  const result = await supabaseAdminRequest<{ id: string }>(
    '/auth/v1/admin/users',
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, tenantId },
      }),
    },
  );

  return result.id;
}

async function ensureSupabaseAuthUser(
  email: string,
  password: string,
  name: string,
  tenantId: string,
) {
  const existingUserId = await findSupabaseAuthUserByEmail(email);

  if (existingUserId && recreateSupabaseAuth) {
    await deleteSupabaseAuthUser(existingUserId);
  } else if (existingUserId) {
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

  for (const role of Object.values(UserRole)) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role },
    });
  }

  const supabaseAuthUserId = await ensureSupabaseAuthUser(
    adminEmail,
    adminPassword,
    adminName,
    tenant.id,
  );

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
        connect: [{ name: UserRole.ADMIN }],
      },
    },
    create: {
      id: supabaseAuthUserId,
      tenantId: tenant.id,
      email: adminEmail,
      name: adminName,
      isPlatformAdmin: seedPlatformAdmin,
      roles: {
        connect: [{ name: UserRole.ADMIN }],
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
