import { createState } from '@piant/core';
import { Button, Combobox, OverlayHost, Stack, UIProvider } from '@piant/ui';
export default function UIComboboxExample() {
  const [empty, setEmpty] = createState(false);
  const options = [
    { value: 'draft', label: 'Draft 草稿' },
    { value: 'print', label: 'Print 印刷' },
    { value: 'locked', label: 'Locked 禁用', disabled: true },
  ];
  return (
    <UIProvider>
      {() => (
        <OverlayHost>
          {() => (
            <Stack gap="sm" style={{ width: '100%' }}>
              <Combobox
                label="候选示例"
                options={empty() ? [] : options}
                placeholder="输入关键词筛选"
              />
              <Button size="sm" onPress={() => setEmpty((v) => !v)}>
                切换空候选
              </Button>
            </Stack>
          )}
        </OverlayHost>
      )}
    </UIProvider>
  );
}
