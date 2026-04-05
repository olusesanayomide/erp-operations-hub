import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@erp.com';
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'AdminPassword123!';
const adminName = process.env.SEED_ADMIN_NAME ?? 'System Admin';

async function ensureSupabaseAuthUser(
  email: string,
  password: string,
  name: string,
) {
  const existingUsers = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id::text
    FROM auth.users
    WHERE email = ${email}
    LIMIT 1
  `;

  if (existingUsers[0]?.id) {
    return existingUsers[0].id;
  }

  const createdUsers = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH new_user AS (
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        ${email},
        crypt(${password}, gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('name', ${name}),
        now(),
        now()
      )
      RETURNING id, email
    ),
    new_identity AS (
      INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        new_user.id,
        new_user.id::text,
        jsonb_build_object('sub', new_user.id::text, 'email', new_user.email),
        'email',
        now(),
        now(),
        now()
      FROM new_user
    )
    SELECT id::text
    FROM new_user
  `;

  if (!createdUsers[0]?.id) {
    throw new Error(`Failed to create Supabase auth user for ${email}`);
  }

  return createdUsers[0].id;
}

async function main() {
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  console.log('Seeding database...');

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
  );

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      password: hashedPassword,
      roles: {
        set: [],
        connect: [{ name: UserRole.ADMIN }],
      },
    },
    create: {
      id: supabaseAuthUserId,
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      roles: {
        connect: [{ name: UserRole.ADMIN }],
      },
    },
  });

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
