-- CreateTable
CREATE TABLE "profit_rate_configs" (
    "id" TEXT NOT NULL,
    "rates_json" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profit_rate_configs_pkey" PRIMARY KEY ("id")
);
