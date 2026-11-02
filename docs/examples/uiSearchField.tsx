import { createState } from '@piant/core';
import { Button, SearchField, Stack, UIProvider } from '@piant/ui';
export default function UISearchFieldExample() {
  const [readOnly, setReadOnly] = createState(false);
  const [placeholder, setPlaceholder] = createState('输入关键词，Enter 搜索');
  return (
    <UIProvider>
      {() => (
        <Stack gap="sm" style={{ width: '100%' }}>
          <SearchField
            aria-label="搜索示例"
            clearLabel="清除搜索示例"
            readOnly={readOnly()}
            placeholder={placeholder()}
            onSearch={(value) => setPlaceholder(`已搜索：${value}`)}
          />
          <Button size="sm" onPress={() => setReadOnly((v) => !v)}>
            切换搜索只读
          </Button>
        </Stack>
      )}
    </UIProvider>
  );
}
