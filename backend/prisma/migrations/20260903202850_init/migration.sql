-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CLIENTE_EXTERNO', 'LABORATORIO', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "sync_status" AS ENUM ('PENDIENTE', 'SINCRONIZADA');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "role" "user_role" NOT NULL,
    "company_name" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" SERIAL NOT NULL,
    "key_value" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" BIGSERIAL NOT NULL,
    "external_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" VARCHAR(100) NOT NULL,
    "company" VARCHAR(255) NOT NULL,
    "patient" VARCHAR(255) NOT NULL,
    "od_sphere" DECIMAL(6,2),
    "od_cylinder" DECIMAL(6,2),
    "od_axis" DECIMAL(6,2),
    "od_addition" DECIMAL(6,2),
    "od_dnp" DECIMAL(6,2),
    "od_height" DECIMAL(6,2),
    "od_product_code" VARCHAR(100),
    "oi_sphere" DECIMAL(6,2),
    "oi_cylinder" DECIMAL(6,2),
    "oi_axis" DECIMAL(6,2),
    "oi_addition" DECIMAL(6,2),
    "oi_dnp" DECIMAL(6,2),
    "oi_height" DECIMAL(6,2),
    "oi_product_code" VARCHAR(100),
    "treatment" VARCHAR(50),
    "mount_type" VARCHAR(50),
    "mount_brand" VARCHAR(100),
    "mount_model" VARCHAR(100),
    "mount_color" VARCHAR(100),
    "coloration_color" VARCHAR(100),
    "coloration_unicolor" BOOLEAN NOT NULL DEFAULT false,
    "coloration_degradado_percent" DECIMAL(5,2),
    "observations" TEXT,
    "sync_status" "sync_status" NOT NULL DEFAULT 'PENDIENTE',
    "synced_at" TIMESTAMPTZ(6),
    "created_by" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_value_key" ON "api_keys"("key_value");

-- CreateIndex
CREATE UNIQUE INDEX "orders_external_id_key" ON "orders"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "idx_orders_company" ON "orders"("company");

-- CreateIndex
CREATE INDEX "idx_orders_sync_status" ON "orders"("sync_status");

-- CreateIndex
CREATE INDEX "idx_orders_created_by" ON "orders"("created_by");

-- CreateIndex
CREATE INDEX "idx_orders_created_at" ON "orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_orders_sync_status_created_at_id" ON "orders"("sync_status", "created_at", "id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK constraints del esquema del TXT (anexo R6: strings identicas en
-- formulario, BD y JSON)
ALTER TABLE "orders" ADD CONSTRAINT "orders_treatment_check" CHECK ("treatment" IS NULL OR "treatment" IN ('ECO (AR Verde)', 'OCEAN (AR Azul)', 'SOLERX SILVER', 'SOLERX BLUE'));
ALTER TABLE "orders" ADD CONSTRAINT "orders_mount_type_check" CHECK ("mount_type" IS NULL OR "mount_type" IN ('METAL ARO COMPLETO', 'METAL SEMI-AEREA', 'PASTA ARO COMPLETO', 'PASTA SEMI-AEREA', 'AL AIRE'));
