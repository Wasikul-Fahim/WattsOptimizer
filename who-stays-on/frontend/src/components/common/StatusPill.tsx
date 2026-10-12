import { Badge } from "@/components/ui/badge";
import type { Analysis } from "@/lib/analytics";

export function ResultStatusBadge({ analysis }: { analysis: Analysis }) {
  if (analysis.status === "infeasible") return <Badge variant="danger">Infeasible · best effort</Badge>;
  if (analysis.solver === "cp-sat") return <Badge variant="success">Optimal · CP-SAT</Badge>;
  return <Badge variant="warning">{analysis.solver} fallback</Badge>;
}
