import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ShopView } from "@/lib/analytics";
import { shopName } from "@/lib/format";
import { StatusCell } from "./StatusCell";

export function ShopRow({ shop, onSelect }: { shop: ShopView; onSelect?: (shopId: string, hour: number) => void }) {
  return (
    <tr>
      <td className="sticky left-0 z-10 bg-card py-1 pl-3 pr-3 print:py-0">
        <div className="flex items-center gap-2 whitespace-nowrap text-[16px] font-bold print:text-[10.5px]">
          {shopName(shop.id)}
          {shop.type === "mandatory" && (
            <Badge variant="mandatory" className="print:h-4 print:text-[8px]">
              <Shield /> Mandatory
            </Badge>
          )}
        </div>
        <div className="font-mono text-[13px] text-muted-foreground print:hidden">
          {shop.kw} kW · {shop.darkHours} dark
        </div>
      </td>
      {shop.cells.map((cell) => (
        <td key={cell.hour} className="p-0.5 print:p-0">
          <StatusCell cell={cell} shopId={shop.id} onSelect={onSelect && cell.state === "off" ? () => onSelect(shop.id, cell.hour) : undefined} />
        </td>
      ))}
    </tr>
  );
}
