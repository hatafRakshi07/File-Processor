import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, Plus, Printer, Trash2, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, XCircle, Send, Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type InvoiceItem = { id?: number; description: string; quantity: number; unitPrice: number; amount: number };
type Invoice = {
  id: number; invoiceNumber: string; customerId: number; branchId: number;
  status: string; issueDate: string; dueDate?: string;
  subtotal: number; taxRate: number; taxAmount: number; discountAmount: number; total: number;
  notes?: string; terms?: string;
  customerName?: string; customerMobile?: string; branchName?: string; createdByName?: string;
  createdAt: string;
  items?: InvoiceItem[];
};
type Customer = { id: number; name: string; mobile?: string; address?: string };
type Branch = { id: number; name: string };
type Summary = { total: number; draft: number; sent: number; paid: number; overdue: number; cancelled: number; totalAmount: number; paidAmount: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline", sent: "secondary", paid: "default", overdue: "destructive", cancelled: "secondary",
};
const statusIcon: Record<string, React.ReactNode> = {
  draft: <Clock className="h-3 w-3" />,
  sent: <Send className="h-3 w-3" />,
  paid: <CheckCircle2 className="h-3 w-3" />,
  overdue: <AlertTriangle className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
};

// ---------------------------------------------------------------------------
// Invoice print view (rendered in a hidden div, then window.print())
// ---------------------------------------------------------------------------
function PrintableInvoice({ invoice }: { invoice: Invoice }) {
  return (
    <div id="invoice-print-area" className="hidden print:block p-8 font-sans text-sm text-gray-900 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">INVOICE</h1>
          <p className="text-gray-500">#{invoice.invoiceNumber}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{invoice.branchName}</p>
          <p className="text-gray-500">Bissi Management System</p>
        </div>
      </div>
      {/* Customer + Dates */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Bill To</p>
          <p className="font-semibold">{invoice.customerName}</p>
          {invoice.customerMobile && <p className="text-gray-600">{invoice.customerMobile}</p>}
        </div>
        <div className="text-right">
          <p><span className="text-gray-500">Issue Date: </span>{invoice.issueDate}</p>
          {invoice.dueDate && <p><span className="text-gray-500">Due Date: </span>{invoice.dueDate}</p>}
          <p className="mt-1">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${invoice.status === "paid" ? "bg-green-100 text-green-700" : invoice.status === "overdue" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
              {invoice.status.toUpperCase()}
            </span>
          </p>
        </div>
      </div>
      {/* Items table */}
      <table className="w-full mb-6 border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left py-2 font-semibold">Description</th>
            <th className="text-right py-2 font-semibold">Qty</th>
            <th className="text-right py-2 font-semibold">Unit Price</th>
            <th className="text-right py-2 font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items ?? []).map((item, i) => (
            <tr key={i} className="border-b border-gray-200">
              <td className="py-2">{item.description}</td>
              <td className="text-right py-2">{item.quantity}</td>
              <td className="text-right py-2">{fmt(item.unitPrice)}</td>
              <td className="text-right py-2">{fmt(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-56 space-y-1">
          <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
          {invoice.taxRate > 0 && <div className="flex justify-between"><span className="text-gray-600">Tax ({invoice.taxRate}%)</span><span>{fmt(invoice.taxAmount)}</span></div>}
          {invoice.discountAmount > 0 && <div className="flex justify-between"><span className="text-gray-600">Discount</span><span>-{fmt(invoice.discountAmount)}</span></div>}
          <Separator className="my-1" />
          <div className="flex justify-between font-bold text-base"><span>Total</span><span>{fmt(invoice.total)}</span></div>
        </div>
      </div>
      {invoice.notes && <div className="mt-8 p-3 bg-gray-50 rounded"><p className="text-xs font-semibold text-gray-500 mb-1">Notes</p><p>{invoice.notes}</p></div>}
      {invoice.terms && <div className="mt-4 p-3 bg-gray-50 rounded"><p className="text-xs font-semibold text-gray-500 mb-1">Terms & Conditions</p><p>{invoice.terms}</p></div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Invoice Dialog
// ---------------------------------------------------------------------------
type LineItem = { description: string; quantity: string; unitPrice: string };

function CreateInvoiceDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: "1", unitPrice: "" }]);

  const { data: customers } = useQuery<{ data: Customer[] }>({ queryKey: ["customers-list"], queryFn: () => api.get("/customers?limit=200") });
  const { data: branches } = useQuery<{ data: Branch[] }>({ queryKey: ["branches-list"], queryFn: () => api.get("/branches") });

  const addItem = () => setItems((prev) => [...prev, { description: "", quantity: "1", unitPrice: "" }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: string) =>
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const subtotal = items.reduce((sum, it) => sum + parseFloat(it.quantity || "0") * parseFloat(it.unitPrice || "0"), 0);
  const taxAmt = subtotal * (parseFloat(taxRate || "0") / 100);
  const total = subtotal + taxAmt - parseFloat(discountAmount || "0");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/invoices", {
        customerId: parseInt(customerId, 10),
        branchId: parseInt(branchId, 10),
        issueDate,
        dueDate: dueDate || undefined,
        taxRate: parseFloat(taxRate),
        discountAmount: parseFloat(discountAmount),
        notes: notes || undefined,
        terms: terms || undefined,
        items: items.map((it) => ({
          description: it.description,
          quantity: parseFloat(it.quantity),
          unitPrice: parseFloat(it.unitPrice),
        })),
      }),
    onSuccess: () => {
      toast({ title: "Invoice created" });
      setOpen(false);
      onCreated();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const canSubmit = customerId && branchId && issueDate && items.every((it) => it.description && it.unitPrice);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4 p-1">
            {/* Customer + Branch */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers?.data?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Branch *</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches?.data?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Issue Date *</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Qty" min="0.001" step="0.001" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" placeholder="Unit Price" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} />
                    </div>
                    <div className="col-span-1 text-right text-sm text-muted-foreground">
                      {fmt(parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0"))}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax / Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tax Rate (%)</Label>
                <Input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Discount (₹)</Label>
                <Input type="number" min="0" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
              </div>
            </div>

            {/* Summary */}
            <Card className="bg-muted/40">
              <CardContent className="pt-4">
                <div className="flex justify-end">
                  <div className="w-48 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(subtotal)}</span></div>
                    {parseFloat(taxRate) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{fmt(taxAmt)}</span></div>}
                    {parseFloat(discountAmount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{fmt(parseFloat(discountAmount))}</span></div>}
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Total</span><span>{fmt(total)}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes / Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea rows={3} placeholder="Internal notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Terms & Conditions</Label>
                <Textarea rows={3} placeholder="Payment terms..." value={terms} onChange={(e) => setTerms(e.target.value)} />
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t mt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create Invoice"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Invoice Detail Dialog (view + print)
// ---------------------------------------------------------------------------
function InvoiceDetailDialog({ invoiceId, onClose }: { invoiceId: number; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["invoice", invoiceId],
    queryFn: () => api.get(`/invoices/${invoiceId}`),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/invoices/${invoiceId}`, { status }),
    onSuccess: () => {
      toast({ title: "Status updated" });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !invoice) return null;

  const nextStatuses: Record<string, string[]> = {
    draft: ["sent", "cancelled"],
    sent: ["paid", "overdue", "cancelled"],
    overdue: ["paid", "cancelled"],
    paid: [],
    cancelled: [],
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            Invoice #{invoice.invoiceNumber}
            <Badge variant={statusVariant[invoice.status]} className="flex items-center gap-1 ml-1">
              {statusIcon[invoice.status]}
              {invoice.status.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1">
          {/* Print-visible invoice */}
          <div className="space-y-6 p-1">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Bill To</p>
                <p className="font-semibold">{invoice.customerName}</p>
                {invoice.customerMobile && <p className="text-sm text-muted-foreground">{invoice.customerMobile}</p>}
              </div>
              <div className="text-right space-y-1 text-sm">
                <p><span className="text-muted-foreground">Branch: </span>{invoice.branchName}</p>
                <p><span className="text-muted-foreground">Issue Date: </span>{invoice.issueDate}</p>
                {invoice.dueDate && <p><span className="text-muted-foreground">Due Date: </span>{invoice.dueDate}</p>}
                <p><span className="text-muted-foreground">Created by: </span>{invoice.createdByName}</p>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-20">Qty</TableHead>
                  <TableHead className="text-right w-28">Unit Price</TableHead>
                  <TableHead className="text-right w-28">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoice.items ?? []).map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{fmt(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{fmt(item.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
                {invoice.taxRate > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({invoice.taxRate}%)</span><span>{fmt(invoice.taxAmount)}</span></div>}
                {invoice.discountAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{fmt(invoice.discountAmount)}</span></div>}
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>{fmt(invoice.total)}</span></div>
              </div>
            </div>

            {(invoice.notes || invoice.terms) && <Separator />}
            {invoice.notes && (
              <div><p className="text-xs font-semibold text-muted-foreground mb-1">NOTES</p><p className="text-sm">{invoice.notes}</p></div>
            )}
            {invoice.terms && (
              <div><p className="text-xs font-semibold text-muted-foreground mb-1">TERMS & CONDITIONS</p><p className="text-sm">{invoice.terms}</p></div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t mt-2">
          <div className="flex gap-2">
            {nextStatuses[invoice.status]?.map((s) => (
              <Button key={s} variant="outline" size="sm" onClick={() => statusMutation.mutate(s)} disabled={statusMutation.isPending}>
                Mark as {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />Print
            </Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Invoices Page
// ---------------------------------------------------------------------------
export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ data: Invoice[]; total: number; page: number; limit: number }>({
    queryKey: ["invoices", page, statusFilter],
    queryFn: () => api.get(`/invoices?page=${page}&limit=20${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`),
  });

  const { data: summary } = useQuery<Summary>({
    queryKey: ["invoices-summary"],
    queryFn: () => api.get("/invoices/summary"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      toast({ title: "Invoice deleted" });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices-summary"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="space-y-6">
      {/* Print-only invoice */}
      {selectedId && (
        <div className="print:block hidden">
          {/* Content injected by PrintableInvoice, shown only on print */}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Create and manage customer invoices</p>
        </div>
        <CreateInvoiceDialog onCreated={() => { qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["invoices-summary"] }); }} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.total ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-500">{summary?.draft ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary?.paid ?? 0}</div>
            <p className="text-xs text-muted-foreground">{fmt(summary?.paidAmount ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{summary?.overdue ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-xl font-bold text-blue-600">{fmt(summary?.totalAmount ?? 0)}</div></CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "draft", "sent", "paid", "overdue", "cancelled"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatusFilter(s); setPage(1); }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Invoice Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : !data?.data?.length ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No invoices found</TableCell></TableRow>
              ) : (
                data.data.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.customerName ?? `#${inv.customerId}`}</TableCell>
                    <TableCell>{inv.branchName}</TableCell>
                    <TableCell>{inv.issueDate}</TableCell>
                    <TableCell>{inv.dueDate ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(inv.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[inv.status]} className="flex items-center gap-1 w-fit">
                        {statusIcon[inv.status]}
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedId(inv.id)} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {inv.status === "draft" && (
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => { if (confirm("Delete this draft invoice?")) deleteMutation.mutate(inv.id); }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({data?.total ?? 0} total)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      {selectedId !== null && (
        <InvoiceDetailDialog invoiceId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
