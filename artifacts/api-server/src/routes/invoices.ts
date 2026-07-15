import { Router, type IRouter } from "express";
import { db, invoicesTable, invoiceItemsTable, customersTable, branchesTable, usersTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Helper: generate next invoice number  INV-YYYY-NNNNN
// ---------------------------------------------------------------------------
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoicesTable)
    .where(sql`invoice_number LIKE ${prefix + "%"}`);
  const seq = (Number(row?.count ?? 0) + 1).toString().padStart(5, "0");
  return `${prefix}${seq}`;
}

// ---------------------------------------------------------------------------
// GET /invoices
// ---------------------------------------------------------------------------
router.get("/invoices", async (req, res): Promise<void> => {
  const { customerId, branchId, status, page = "1", limit = "20" } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(parseInt(limit as string, 10), 100);
  const offset = (pageNum - 1) * limitNum;

  let rows = await db
    .select({
      inv: invoicesTable,
      customerName: customersTable.name,
      customerMobile: customersTable.mobile,
      branchName: branchesTable.name,
      createdByName: usersTable.name,
    })
    .from(invoicesTable)
    .leftJoin(customersTable, eq(invoicesTable.customerId, customersTable.id))
    .leftJoin(branchesTable, eq(invoicesTable.branchId, branchesTable.id))
    .leftJoin(usersTable, eq(invoicesTable.createdByUserId, usersTable.id))
    .orderBy(desc(invoicesTable.createdAt));

  if (customerId) rows = rows.filter((r) => r.inv.customerId === parseInt(customerId as string, 10));
  if (branchId) rows = rows.filter((r) => r.inv.branchId === parseInt(branchId as string, 10));
  if (status) rows = rows.filter((r) => r.inv.status === status);

  const total = rows.length;
  const sliced = rows.slice(offset, offset + limitNum);

  const data = sliced.map((r) => ({
    ...r.inv,
    subtotal: parseFloat(r.inv.subtotal),
    taxRate: parseFloat(r.inv.taxRate),
    taxAmount: parseFloat(r.inv.taxAmount),
    discountAmount: parseFloat(r.inv.discountAmount),
    total: parseFloat(r.inv.total),
    customerName: r.customerName,
    customerMobile: r.customerMobile,
    branchName: r.branchName,
    createdByName: r.createdByName,
    createdAt: r.inv.createdAt.toISOString(),
    updatedAt: r.inv.updatedAt.toISOString(),
  }));

  res.json({ data, total, page: pageNum, limit: limitNum });
});

// ---------------------------------------------------------------------------
// GET /invoices/summary
// ---------------------------------------------------------------------------
router.get("/invoices/summary", async (_req, res): Promise<void> => {
  const rows = await db.select({ status: invoicesTable.status, total: invoicesTable.total }).from(invoicesTable);
  const summary = { total: 0, draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0, totalAmount: 0, paidAmount: 0 };
  for (const r of rows) {
    summary.total++;
    const amt = parseFloat(r.total);
    summary.totalAmount += amt;
    if (r.status === "draft") summary.draft++;
    else if (r.status === "sent") summary.sent++;
    else if (r.status === "paid") { summary.paid++; summary.paidAmount += amt; }
    else if (r.status === "overdue") summary.overdue++;
    else if (r.status === "cancelled") summary.cancelled++;
  }
  res.json(summary);
});

// ---------------------------------------------------------------------------
// GET /invoices/:id  (with line items)
// ---------------------------------------------------------------------------
router.get("/invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({
      inv: invoicesTable,
      customerName: customersTable.name,
      customerMobile: customersTable.mobile,
      customerAddress: customersTable.address,
      branchName: branchesTable.name,
      createdByName: usersTable.name,
    })
    .from(invoicesTable)
    .leftJoin(customersTable, eq(invoicesTable.customerId, customersTable.id))
    .leftJoin(branchesTable, eq(invoicesTable.branchId, branchesTable.id))
    .leftJoin(usersTable, eq(invoicesTable.createdByUserId, usersTable.id))
    .where(eq(invoicesTable.id, id));

  if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }

  const items = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, id))
    .orderBy(invoiceItemsTable.sortOrder);

  res.json({
    ...row.inv,
    subtotal: parseFloat(row.inv.subtotal),
    taxRate: parseFloat(row.inv.taxRate),
    taxAmount: parseFloat(row.inv.taxAmount),
    discountAmount: parseFloat(row.inv.discountAmount),
    total: parseFloat(row.inv.total),
    customerName: row.customerName,
    customerMobile: row.customerMobile,
    customerAddress: row.customerAddress,
    branchName: row.branchName,
    createdByName: row.createdByName,
    createdAt: row.inv.createdAt.toISOString(),
    updatedAt: row.inv.updatedAt.toISOString(),
    items: items.map((item) => ({
      ...item,
      quantity: parseFloat(item.quantity),
      unitPrice: parseFloat(item.unitPrice),
      amount: parseFloat(item.amount),
    })),
  });
});

// ---------------------------------------------------------------------------
// POST /invoices  (create with line items)
// ---------------------------------------------------------------------------
router.post("/invoices", async (req, res): Promise<void> => {
  const { customerId, branchId, issueDate, dueDate, taxRate = 0, discountAmount = 0, notes, terms, loanId, collectionId, items = [] } = req.body;

  if (!customerId || !branchId || !issueDate) {
    res.status(400).json({ error: "customerId, branchId, and issueDate are required" });
    return;
  }
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "At least one line item is required" });
    return;
  }

  const createdByUserId = (req as any).user?.id ?? 1;
  const invoiceNumber = await generateInvoiceNumber();

  const subtotal = items.reduce((sum: number, it: any) => sum + parseFloat(it.unitPrice) * parseFloat(it.quantity ?? 1), 0);
  const taxAmt = subtotal * (parseFloat(taxRate) / 100);
  const total = subtotal + taxAmt - parseFloat(discountAmount);

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      invoiceNumber,
      customerId: parseInt(customerId, 10),
      branchId: parseInt(branchId, 10),
      createdByUserId,
      issueDate,
      dueDate: dueDate ?? null,
      taxRate: String(taxRate),
      subtotal: String(subtotal.toFixed(2)),
      taxAmount: String(taxAmt.toFixed(2)),
      discountAmount: String(parseFloat(discountAmount).toFixed(2)),
      total: String(total.toFixed(2)),
      notes: notes ?? null,
      terms: terms ?? null,
      loanId: loanId ? parseInt(loanId, 10) : null,
      collectionId: collectionId ? parseInt(collectionId, 10) : null,
    })
    .returning();

  // Insert line items
  const lineItems = items.map((it: any, idx: number) => {
    const qty = parseFloat(it.quantity ?? 1);
    const price = parseFloat(it.unitPrice);
    return {
      invoiceId: invoice.id,
      description: it.description,
      quantity: String(qty),
      unitPrice: String(price),
      amount: String((qty * price).toFixed(2)),
      sortOrder: idx,
    };
  });
  await db.insert(invoiceItemsTable).values(lineItems);

  res.status(201).json({ ...invoice, total: parseFloat(invoice.total), invoiceNumber });
});

// ---------------------------------------------------------------------------
// PATCH /invoices/:id  (update status or details)
// ---------------------------------------------------------------------------
router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const allowed = ["status", "notes", "terms", "dueDate", "taxRate", "discountAmount"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }

  const [updated] = await db
    .update(invoicesTable)
    .set(update as any)
    .where(eq(invoicesTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json({ ...updated, total: parseFloat(updated.total) });
});

// ---------------------------------------------------------------------------
// DELETE /invoices/:id  (only drafts can be deleted)
// ---------------------------------------------------------------------------
router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (existing.status !== "draft") {
    res.status(400).json({ error: "Only draft invoices can be deleted" });
    return;
  }

  await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));
  await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
  res.status(204).end();
});

export default router;
