-- CreateTable
CREATE TABLE "lrs" (
    "id" TEXT NOT NULL,
    "lr_no" TEXT NOT NULL,
    "lr_date" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "vehicle_number" TEXT,
    "from_location" TEXT,
    "to_location" TEXT,
    "material_supply_to" TEXT,
    "loaded_weight" TEXT,
    "empty_weight" TEXT,
    "description_of_goods" TEXT,
    "quantity" TEXT,
    "koel_gate_entry_no" TEXT,
    "koel_gate_entry_date" TEXT,
    "weightslip_no" TEXT,
    "total_no_of_invoices" TEXT,
    "invoice_no" TEXT,
    "grr_no" TEXT,
    "grr_date" TEXT,
    "status" TEXT NOT NULL DEFAULT 'LR Done',
    "bill_submission_date" TEXT,
    "bill_number" TEXT,
    "delivery_locations" TEXT,
    "amount" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lrs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lrs_lr_no_key" ON "lrs"("lr_no");
