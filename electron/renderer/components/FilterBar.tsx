import type { DateFilter } from "../../shared/types";

type Props = {
  filter: DateFilter;
  onChange(filter: DateFilter): void;
};

export function FilterBar({ filter, onChange }: Props) {
  return (
    <section className="panel filter-bar">
      <label>
        订单号
        <input
          placeholder="搜索订单号"
          value={filter.searchText}
          onChange={(event) => onChange({ ...filter, searchText: event.target.value })}
        />
      </label>
      <label>
        开始日期
        <input
          type="date"
          value={filter.startDate}
          onChange={(event) => onChange({ ...filter, startDate: event.target.value })}
        />
      </label>
      <label>
        结束日期
        <input
          type="date"
          value={filter.endDate}
          onChange={(event) => onChange({ ...filter, endDate: event.target.value })}
        />
      </label>
    </section>
  );
}
