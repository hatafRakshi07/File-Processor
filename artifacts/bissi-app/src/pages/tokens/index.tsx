import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function TokensPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tokens</h1>
        <p className="text-muted-foreground">Manage committee member tokens.</p>
      </div>
      <Card className="border-dashed border-2 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Construction className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">Tokens Module Under Construction</h2>
        </CardContent>
      </Card>
    </div>
  );
}
