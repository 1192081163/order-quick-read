type Props = {
  status: string;
};

export function StatusBar({ status }: Props) {
  return <section className="panel status-bar">{status}</section>;
}
