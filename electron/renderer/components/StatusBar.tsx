import { useEffect, useState } from "react";
import { Button, Text } from "@fluentui/react-components";

type Props = {
  status: string;
  actionLabel?: string;
  disabled?: boolean;
  onAction?(): void;
};

export function StatusBar({ actionLabel, disabled = false, onAction, status }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!status) {
      setIsVisible(false);
      return undefined;
    }

    setIsVisible(true);
    const timeoutId = window.setTimeout(() => {
      setIsVisible(false);
    }, 4_000);

    return () => window.clearTimeout(timeoutId);
  }, [status]);

  if (!status || !isVisible) {
    return null;
  }

  return (
    <section className="status-toast" role="status" aria-label="运行状态" aria-live="polite">
      <Text>{status}</Text>
      {actionLabel && onAction ? (
        <Button disabled={disabled} onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}
