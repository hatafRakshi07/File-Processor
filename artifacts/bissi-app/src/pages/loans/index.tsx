import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function LoansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Loans Management</h1>
        <p className="text-muted-foreground">Manage active loans, approvals and EMI schedules.</p>
      </div>
      
      <Card className="border-dashed border-2 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Construction className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">Loans Module Under Construction</h2>
          <p className="text-muted-foreground max-w-md">
            The full loan lifecycle management interface is currently being built.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
