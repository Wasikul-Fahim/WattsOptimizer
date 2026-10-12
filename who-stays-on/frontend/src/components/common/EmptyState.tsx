import { FileUp, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export function EmptyState({ title = "No roster yet", text }: { title?: string; text?: string }) {
  const { can } = useAuth();
  const secretary = can("secretary");
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-brand-gradient text-[#05222f]">
        <Zap className="size-6" />
      </div>
      <h2 className="mt-4 text-lg font-black">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {text ?? (secretary ? "Upload today's market JSON to build the power roster." : "The secretary has not published today's roster yet.")}
      </p>
      <div className="mt-5 flex gap-2">
        {secretary && (
          <Button variant="primary" asChild>
            <Link to="/upload">
              <FileUp /> Upload JSON
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
