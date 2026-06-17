import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow, Text } from "@fluentui/react-components";

import { sentDateFromMessageDate } from "../../shared/date";
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
            <TableHeaderCell className="order-number-column">订单号</TableHeaderCell>
            <TableHeaderCell className="sent-date-column">发送时间</TableHeaderCell>
            <TableHeaderCell className="deadline-column">截至时间</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3}>
              <Text className="empty-orders">暂无订单</Text>
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.orderNumber}>
              <TableCell className="order-number-column">
                <Text className="order-number-text" weight="semibold">
                  {row.orderNumber}
                </Text>
              </TableCell>
              <TableCell className="sent-date-column">{sentDateFromMessageDate(row.messageDate) ?? "-"}</TableCell>
              <TableCell className="deadline-column">{row.deadline}</TableCell>
            </TableRow>
          ))
        )}
        </TableBody>
      </Table>
    </section>
  );
}
