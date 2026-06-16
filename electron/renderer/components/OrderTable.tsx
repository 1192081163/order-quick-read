import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow, Text } from "@fluentui/react-components";

import type { OrderRow } from "../../shared/types";

type Props = {
  rows: OrderRow[];
};

export function OrderTable({ rows }: Props) {
  return (
    <section className="orders-panel">
      <Table aria-label="订单列表" className="orders-table">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>订单号</TableHeaderCell>
            <TableHeaderCell>截至时间</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={2}>
              <Text className="empty-orders">暂无订单</Text>
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.orderNumber}>
              <TableCell>
                <Text weight="semibold">{row.orderNumber}</Text>
              </TableCell>
              <TableCell>{row.deadline}</TableCell>
            </TableRow>
          ))
        )}
        </TableBody>
      </Table>
    </section>
  );
}
