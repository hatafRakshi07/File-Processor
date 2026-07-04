import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Analytics and exports.</p>
      </div>
      
      <Card className="border-dashed border-2 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Construction className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">Reports Module Under Construction</h2>
          <p className="text-muted-foreground max-w-md">
            The comprehensive reporting suite with PDF/Excel exports and detailed analytics charts will be available in the next release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
