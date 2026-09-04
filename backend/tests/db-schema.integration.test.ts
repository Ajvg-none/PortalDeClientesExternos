/**
 * Test de INTEGRACION - B1.3: verifica que la base de datos resultante de las
 * migraciones Prisma coincide 1:1 con el esquema SQL de INFORMACION DEL
 * PROYECTO.txt MAS el delta del anexo v1.1 (users.must_change_password).
 *
 * Ejecutar SOLO con: npm run test:integration (resetea TEST_DATABASE_URL).
 */
import { PrismaClient } from '@prisma/client';

const testUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

const describeDb = testUrl ? describe : describe.skip;

describeDb('B1.3 - Esquema de BD (1:1 con el TXT + delta v1.1)', () => {
  const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function columnNames(table: string): Promise<string[]> {
    const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 ORDER BY column_name`,
      table,
    );
    return rows.map((r) => r.column_name);
  }

  test('existen las tablas users, api_keys y orders', async () => {
    const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const names = rows.map((r) => r.table_name);
    expect(names).toEqual(expect.arrayContaining(['users', 'api_keys', 'orders']));
  });

  test('users tiene exactamente las columnas del TXT + must_change_password (v1.1)', async () => {
    const cols = await columnNames('users');
    expect(cols).toEqual(
      [
        'id',
        'username',
        'password_hash',
        'email',
        'role',
        'company_name',
        'phone',
        'address',
        'is_active',
        'must_change_password', // delta anexo v1.1 (DEC-6)
        'created_at',
        'updated_at',
      ].sort(),
    );
  });

  test('orders tiene exactamente las columnas del TXT', async () => {
    const cols = await columnNames('orders');
    expect(cols).toEqual(
      [
        'id',
        'external_id',
        'order_number',
        'company',
        'patient',
        'od_sphere',
        'od_cylinder',
        'od_axis',
        'od_addition',
        'od_dnp',
        'od_height',
        'od_product_code',
        'oi_sphere',
        'oi_cylinder',
        'oi_axis',
        'oi_addition',
        'oi_dnp',
        'oi_height',
        'oi_product_code',
        'treatment',
        'mount_type',
        'mount_brand',
        'mount_model',
        'mount_color',
        'coloration_color',
        'coloration_unicolor',
        'coloration_degradado_percent',
        'observations',
        'sync_status',
        'synced_at',
        'created_by',
        'created_at',
        'updated_at',
      ].sort(),
    );
  });

  test('api_keys tiene exactamente las columnas del TXT', async () => {
    const cols = await columnNames('api_keys');
    expect(cols).toEqual(
      ['id', 'key_value', 'description', 'is_active', 'created_at', 'updated_at'].sort(),
    );
  });

  test('los enums user_role y sync_status tienen los valores del TXT', async () => {
    const rows = await prisma.$queryRawUnsafe<{ typname: string; enumlabel: string }[]>(
      `SELECT t.typname, e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
       WHERE t.typname IN ('user_role', 'sync_status')
       ORDER BY t.typname, e.enumsortorder`,
    );
    expect(rows).toEqual([
      { typname: 'sync_status', enumlabel: 'PENDIENTE' },
      { typname: 'sync_status', enumlabel: 'SINCRONIZADA' },
      { typname: 'user_role', enumlabel: 'CLIENTE_EXTERNO' },
      { typname: 'user_role', enumlabel: 'LABORATORIO' },
      { typname: 'user_role', enumlabel: 'ADMINISTRADOR' },
    ]);
  });

  test('deltas y defaults clave: must_change_password=true, sync_status PENDIENTE, external_id UUID', async () => {
    const rows = await prisma.$queryRawUnsafe<{ table_name: string; column_name: string; column_default: string | null }[]>(
      `SELECT table_name, column_name, column_default FROM information_schema.columns
       WHERE table_schema = 'public' AND (
         (table_name = 'users' AND column_name = 'must_change_password') OR
         (table_name = 'orders' AND column_name = 'sync_status') OR
         (table_name = 'orders' AND column_name = 'external_id')
       )`,
    );
    const byColumn = Object.fromEntries(rows.map((r) => [r.column_name, r.column_default ?? '']));
    expect(byColumn.must_change_password).toBe('true');
    expect(byColumn.sync_status).toContain('PENDIENTE');
    expect(byColumn.external_id).toContain('gen_random_uuid()');
  });

  test('orders incluye los CHECK constraints de tratamiento y tipo de montura del TXT', async () => {
    const rows = await prisma.$queryRawUnsafe<{ conname: string }[]>(
      `SELECT c.conname FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       WHERE t.relname = 'orders' AND c.contype = 'c'
       ORDER BY c.conname`,
    );
    const names = rows.map((r) => r.conname);
    expect(names).toEqual(
      expect.arrayContaining(['orders_treatment_check', 'orders_mount_type_check']),
    );
  });

  test('existen las unicas de order_number/external_id y los indices del TXT', async () => {
    const rows = await prisma.$queryRawUnsafe<{ indexname: string }[]>(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname`,
    );
    const names = rows.map((r) => r.indexname);
    expect(names).toEqual(
      expect.arrayContaining([
        'orders_order_number_key',
        'orders_external_id_key',
        'idx_orders_created_at',
        'idx_orders_company',
        'idx_orders_sync_status',
        'idx_orders_created_by',
        'idx_orders_sync_status_created_at_id', // R3/PC-2
        'users_username_key',
        'api_keys_key_value_key',
      ]),
    );
  });

  test('el indice compuesto FIFO (sync_status, created_at, id) tiene la definicion EXACTA del TXT (R3/PC-2)', async () => {
    const rows = await prisma.$queryRawUnsafe<{ indexdef: string }[]>(
      `SELECT indexdef FROM pg_indexes
       WHERE schemaname = 'public' AND indexname = 'idx_orders_sync_status_created_at_id'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].indexdef).toBe(
      'CREATE INDEX idx_orders_sync_status_created_at_id ON public.orders USING btree (sync_status, created_at, id)',
    );
  });
});
