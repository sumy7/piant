import { createState } from '@piant/core';
import { Button, NumberField, Stack, UIProvider } from '@piant/ui';
export default function UINumberFieldExample() {
  const [value, setValue] = createState<number | null>(0.2);
  return (
    <UIProvider>
      {() => (
        <Stack gap="sm" style={{ width: '100%' }}>
          <NumberField
            aria-label="数字示例"
            value={value()}
            onValueChange={setValue}
            min={-1}
            max={1}
            step={0.1}
            incrementLabel="增加数字示例"
            decrementLabel="减少数字示例"
          />
          <Button size="sm" onPress={() => setValue(null)}>
            设为空值
          </Button>
        </Stack>
      )}
    </UIProvider>
  );
}
