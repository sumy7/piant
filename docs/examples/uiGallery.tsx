import { createState, View } from '@piant/core';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogConfirm,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  OverlayHost,
  Stack,
  Surface,
  TextField,
  UIProvider,
} from '@piant/ui';
import { SettingsPanel } from '../../examples/ui-gallery/src/SettingsPanel';

export default function UIGalleryExample() {
  const [large, setLarge] = createState(false);
  const [reduced, setReduced] = createState(false);
  const appearanceLabel = () =>
    large() ? '恢复默认外观' : '深色 / 紧凑 / 200%';
  const motionLabel = () => (reduced() ? '允许动画' : '减少动画');
  return (
    <UIProvider
      colorMode={large() ? 'dark' : 'light'}
      density={large() ? 'compact' : 'comfortable'}
      fontScale={large() ? 2 : 1}
      reducedMotion={reduced()}
    >
      {() => (
        <OverlayHost>
          {() => (
            <Stack gap="sm" style={{ width: '100%', height: '100%' }}>
              <Surface tone="canvas" padding="sm" style={{ width: '100%' }}>
                <Stack direction="row" wrap gap="sm">
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => setLarge((previous) => !previous)}
                  >
                    {appearanceLabel()}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => setReduced((previous) => !previous)}
                  >
                    {motionLabel()}
                  </Button>
                  <Dialog>
                    {() => (
                      <View>
                        <DialogTrigger size="sm" variant="secondary">
                          Gallery 编辑资料
                        </DialogTrigger>
                        <DialogContent
                          height={260}
                          actions={() => (
                            <DialogClose>完成 Gallery 编辑</DialogClose>
                          )}
                        >
                          {() => (
                            <Stack gap="md">
                              <DialogTitle>Gallery 资料草稿</DialogTitle>
                              <TextField
                                aria-label="Gallery 弹窗名称"
                                defaultValue="Piant"
                              />
                            </Stack>
                          )}
                        </DialogContent>
                      </View>
                    )}
                  </Dialog>
                  <AlertDialog>
                    {() => (
                      <View>
                        <AlertDialogTrigger size="sm" variant="danger">
                          Gallery 重置确认
                        </AlertDialogTrigger>
                        <AlertDialogContent
                          height={260}
                          actions={() => (
                            <Stack direction="row" gap="sm" wrap>
                              <AlertDialogCancel variant="secondary">
                                保留 Gallery 外观
                              </AlertDialogCancel>
                              <AlertDialogConfirm
                                onPress={() => {
                                  setLarge(false);
                                  setReduced(false);
                                }}
                              >
                                重置 Gallery 外观
                              </AlertDialogConfirm>
                            </Stack>
                          )}
                        >
                          {() => (
                            <Stack gap="md">
                              <AlertDialogTitle>
                                重置预览外观？
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                恢复浅色默认字号并允许动画，保留设置面板的编辑值。
                              </AlertDialogDescription>
                            </Stack>
                          )}
                        </AlertDialogContent>
                      </View>
                    )}
                  </AlertDialog>
                </Stack>
              </Surface>
              <SettingsPanel
                title="设置预览"
                colorMode={large() ? 'dark' : 'light'}
                density={large() ? 'compact' : 'comfortable'}
                fontScale={large() ? 2 : 1}
                reducedMotion={reduced()}
              />
            </Stack>
          )}
        </OverlayHost>
      )}
    </UIProvider>
  );
}
