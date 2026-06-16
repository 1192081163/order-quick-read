import type { OrderRow } from "../../shared/types";

type Props = {
  rows: OrderRow[];
};

export function OrderTable({ rows }: Props) {
  return (
    <table className="orders-table">
      <thead>
        <tr>
          <th>订单号</th>
          <th>截至时间</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={2}>暂无订单</td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.orderNumber}>
              <td>{row.orderNumber}</td>
              <td>{row.deadline}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
