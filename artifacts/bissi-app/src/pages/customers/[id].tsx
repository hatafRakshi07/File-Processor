import React from "react";
import { useParams, Link } from "wouter";
import { 
  useGetCustomer, 
  useGetCustomerPassbook, 
  useGetCustomerTimeline 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Briefcase, 
  Clock, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Gift,
  FileText,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = parseInt(params.id || "0");

  const { data: customer, isLoading: customerLoading } = useGetCustomer(customerId);
  const { data: passbook, isLoading: passbookLoading } = useGetCustomerPassbook(customerId);
  const { data: timeline, isLoading: timelineLoading } = useGetCustomerTimeline(customerId);

  if (customerLoading) return <div className="p-8">Loading customer details...</div>;
  if (!customer) return <div className="p-8">Customer not found</div>;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
            {customer.photoUrl ? (
              <img src={customer.photoUrl} alt={customer.name} className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
              <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                {customer.status}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono text-sm">{customer.referenceNumber}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.mobile}</span>
            </div>
            {customer.alternateMobile && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground/60" />
                <span>Alt: {customer.alternateMobile}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {(customer.address || customer.city) && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{[customer.address, customer.city].filter(Boolean).join(", ")}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>Branch: {customer.branchName}</span>
            </div>
            {customer.referenceName && (
              <div className="flex items-center gap-3 text-sm">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span>Reference: {customer.referenceName}</span>
              </div>
            )}
            {customer.aadhaar && (
              <div className="flex items-center gap-3 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>Aadhaar: {customer.aadhaar}</span>
              </div>
            )}
            {customer.pan && (
              <div className="flex items-center gap-3 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>PAN: {customer.pan}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Tokens</p>
                <p className="text-2xl font-bold">{customer.totalTokens || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Loans</p>
                <p className="text-2xl font-bold">{customer.totalLoans || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(customer.totalPaid || 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(passbook?.totalDue || 0)}</p>
              </div>
            </div>

            {customer.recoveryNotes && (
              <div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-800 uppercase tracking-wider">Recovery Notes</p>
                  <p className="text-sm text-red-700 mt-1">{customer.recoveryNotes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="passbook" className="w-full">
        <TabsList>
          <TabsTrigger value="passbook">Passbook & Ledgers</TabsTrigger>
          <TabsTrigger value="gifts">Gifts & Draws</TabsTrigger>
          <TabsTrigger value="documents">Uploaded Documents</TabsTrigger>
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
        </TabsList>
        
        <TabsContent value="passbook" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Digital Ledger Statement</CardTitle>
              <CardDescription>Transactional logs for all monthly installments and loans</CardDescription>
            </CardHeader>
            <CardContent>
              {passbookLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading ledger...</div>
              ) : (
                <div className="relative border-l border-muted ml-4 space-y-8 pb-4">
                  {passbook?.entries.map((entry, idx) => (
                    <div key={idx} className="relative pl-6">
                      <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${
                        entry.type === 'payment' ? 'bg-emerald-100 text-emerald-600' :
                        entry.type === 'loan_disbursed' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {entry.type === 'payment' ? <ArrowDownRight className="h-3 w-3" /> :
                         entry.type === 'loan_disbursed' ? <ArrowUpRight className="h-3 w-3" /> :
                         <Wallet className="h-3 w-3" />}
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(entry.date), 'MMM dd, yyyy hh:mm a')}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${entry.type === 'payment' ? 'text-emerald-600' : 'text-foreground'}`}>
                            {entry.type === 'payment' ? '+' : '-'}{formatCurrency(entry.amount)}
                          </p>
                          {entry.balance !== undefined && entry.balance !== null && (
                            <p className="text-xs text-muted-foreground">Bal: {formatCurrency(entry.balance)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {passbook?.entries.length === 0 && (
                    <div className="pl-6 text-muted-foreground text-sm py-4">No transactions found.</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gifts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Lucky Draws & Gift History</CardTitle>
              <CardDescription>Gift distribution and lottery logs for this customer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 rounded-lg border border-dashed flex flex-col items-center justify-center text-center">
                  <Gift className="h-10 w-10 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-medium">No Gift distributions recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Gifts distributed via Lucky Draw will automatically show here.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>Aadhaar, PAN, and address proof verification documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customer.documents ? (
                  <div className="p-4 border rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">Customer Docs Package</p>
                        <p className="text-xs text-muted-foreground">Verification Package PDF</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => customer.documents && window.open(customer.documents)}>View</Button>
                  </div>
                ) : (
                  <div className="col-span-full py-8 text-center text-muted-foreground text-sm">
                    No documents uploaded. Alternate/Aadhaar/PAN are registered in profile details.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Activity Timeline</CardTitle>
              <CardDescription>Historical activity flow across all scheme enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading timeline...</div>
              ) : (
                <div className="space-y-6">
                  {timeline?.map((event) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-sm">{event.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                          </div>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {format(new Date(event.date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {timeline?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">No events recorded.</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
