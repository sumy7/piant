import { createState } from '@piant/core';
import {
  Button,
  SplitPane,
  Stack,
  Surface,
  TextField,
  UIProvider,
} from '@piant/ui';
export default function UISplitPaneExample() {
  const [vertical, setVertical] = createState(false);
  return (
    <UIProvider>
      {() => (
        <Stack gap="sm" style={{ width: '100%', height: '100%' }}>
          <Button size="sm" onPress={() => setVertical((v) => !v)}>
            切换分栏方向
          </Button>
          <SplitPane
            name="分栏示例"
            orientation={vertical() ? 'vertical' : 'horizontal'}
            minSize={70}
            minSecondSize={70}
            defaultSize={130}
            style={{ width: '100%', flexGrow: 1 }}
            first={() => (
              <Surface padding="sm">
                <TextField aria-label="第一栏草稿" />
              </Surface>
            )}
            second={() => (
              <Surface padding="sm">
                <TextField aria-label="第二栏草稿" />
              </Surface>
            )}
          />
        </Stack>
      )}
    </UIProvider>
  );
}
