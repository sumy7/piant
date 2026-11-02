import {
  createEffect,
  createMemo,
  createState,
  onCleanup,
  type PNode,
  root,
  ScrollView,
  Text,
  untrack,
  View,
} from '@piant/core';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogConfirm,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
  type ColorMode,
  type ControlDensity,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Menu,
  MenuContent,
  MenuTrigger,
  OverlayHost,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectTrigger,
  Stack,
  Surface,
  TextField,
  ToastProvider,
  ToastViewport,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  UIProvider,
  useToast,
  useUITheme,
} from '@piant/ui';

export interface OverlayWorkflowSnapshot {
  readonly background: string;
  readonly draftName: string;
  readonly savedName: string;
  readonly visibility: string;
  readonly saves: number;
  readonly archives: number;
  readonly menuActions: number;
  readonly undoCount: number;
}
export interface OverlayWorkflowProps {
  name?: string;
  colorMode?: ColorMode;
  density?: ControlDensity;
  fontScale?: number;
  reducedMotion?: boolean | 'system';
  onStateChange?: (snapshot: OverlayWorkflowSnapshot) => void;
}
interface WorkflowState extends OverlayWorkflowSnapshot {
  note: string;
  savedNote: string;
  savedVisibility: string;
}

/** Local document editing shared by the standalone and documentation scenes. */
export function OverlayWorkflow(
  props: OverlayWorkflowProps = {},
): ReturnType<typeof View> {
  let disposed = false;
  let stop = () => {};
  let removeDestroy = () => {};
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    removeDestroy();
  };
  const result = root((cleanup) => {
    stop = cleanup;
    return createMemo(() =>
      untrack(() => (
        <UIProvider
          colorMode={props.colorMode}
          density={props.density}
          fontScale={props.fontScale}
          reducedMotion={props.reducedMotion}
          focusScope="isolate"
        >
          {() => (
            <OverlayHost>
              {() => (
                <ToastProvider>
                  {() =>
                    renderWorkflow(props, (node) => {
                      removeDestroy = node.onDestroy(dispose);
                    })
                  }
                </ToastProvider>
              )}
            </OverlayHost>
          )}
        </UIProvider>
      )),
    );
  });
  onCleanup(dispose);
  return result;
}

function renderWorkflow(
  props: OverlayWorkflowProps,
  bindLifetime: (node: PNode) => void,
): ReturnType<typeof View> {
  const theme = useUITheme();
  const toast = useToast();
  const name = () => props.name?.trim() || '示例';
  const label = (value: string) => `${name()} ${value}`;
  const [state, setState] = createState<WorkflowState>({
    background: '未修改的背景内容',
    draftName: '季度计划',
    savedName: '季度计划',
    visibility: 'team',
    savedVisibility: 'team',
    note: '',
    savedNote: '',
    saves: 0,
    archives: 0,
    menuActions: 0,
    undoCount: 0,
  });
  const [editorOpen, setEditorOpen] = createState(false);
  let alive = true;
  let input: HTMLElement | undefined;
  onCleanup(() => {
    alive = false;
  });
  createEffect(() => {
    const current = state();
    const snapshot: OverlayWorkflowSnapshot = {
      background: current.background,
      draftName: current.draftName,
      savedName: current.savedName,
      visibility: current.visibility,
      saves: current.saves,
      archives: current.archives,
      menuActions: current.menuActions,
      undoCount: current.undoCount,
    };
    untrack(() => props.onStateChange?.(snapshot));
  });
  const edit = (patch: Partial<WorkflowState>) => {
    if (alive) setState((current) => ({ ...current, ...patch }));
  };
  function changeEditor(next: boolean) {
    if (!alive) return;
    setState((current) => ({
      ...current,
      draftName: current.savedName,
      visibility: current.savedVisibility,
      note: current.savedNote,
    }));
    setEditorOpen(next);
  }
  function save() {
    if (!alive) return;
    const previous = state().savedName;
    const previousVisibility = state().savedVisibility;
    const previousNote = state().savedNote;
    setState((current) => ({
      ...current,
      savedName: current.draftName,
      savedVisibility: current.visibility,
      savedNote: current.note,
      saves: current.saves + 1,
    }));
    toast.show({
      id: 'document-save',
      title: label('文档已保存'),
      description: state().savedName,
      duration: 0,
      action: {
        label: label('撤销保存'),
        onAction: () => {
          if (!alive) return;
          setState((current) => ({
            ...current,
            savedName: previous,
            draftName: previous,
            savedVisibility: previousVisibility,
            visibility: previousVisibility,
            savedNote: previousNote,
            note: previousNote,
            undoCount: current.undoCount + 1,
          }));
        },
      },
    });
  }
  function archive() {
    if (!alive) return;
    setState((current) => ({ ...current, archives: current.archives + 1 }));
    toast.show({
      id: 'document-archive',
      title: label('文档已归档'),
      description: state().savedName,
      duration: 0,
    });
    changeEditor(false);
  }
  const menuItems = () => [
    { value: 'duplicate', label: label('复制文档') },
    { value: 'review', label: label('标记审阅') },
    { value: 'delete', label: label('永久删除（不可用）'), disabled: true },
  ];
  const visibilityOptions = [
    { value: 'private', label: '私密' },
    { value: 'team', label: '团队' },
    { value: 'public', label: '公开' },
    { value: 'archived', label: '已归档', disabled: true },
  ];
  const textStyle = () => ({
    color: theme().colors.text,
    fontFamily: theme().typography.fontFamily,
    fontSize: theme().typography.fontSize,
    lineHeight: theme().typography.lineHeight,
    minWidth: 0,
  });
  const rowStyle = {
    minHeight: 44,
    flexShrink: 0,
    minWidth: 0,
    width: '100%' as const,
  };
  const summary = () =>
    `${name()} 已保存：${state().savedName}；保存 ${state().saves} 次；归档 ${state().archives} 次；菜单 ${state().menuActions} 次；撤销 ${state().undoCount} 次`;
  return (
    <Surface
      bordered
      ref={bindLifetime}
      style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}
    >
      <ScrollView style={{ width: '100%', height: '100%' }}>
        <Stack gap="md" style={{ minWidth: 0 }}>
          <Text style={textStyle()}>
            {label('文档工作流：编辑、选择、确认和通知均为本地示例。')}
          </Text>
          <TextField
            aria-label={label('背景草稿')}
            value={state().background}
            onValueChange={(value) => edit({ background: value })}
            style={rowStyle}
          />
          <Dialog
            open={editorOpen()}
            onOpenChange={changeEditor}
            style={rowStyle}
          >
            {() => (
              <View style={{ minWidth: 0 }}>
                <DialogTrigger>{label('编辑文档')}</DialogTrigger>
                <DialogContent
                  width={520}
                  height={600}
                  scrollLabel={label('编辑区滚动')}
                  initialFocus={() => input}
                  actions={() => (
                    <Stack
                      direction="row"
                      gap="sm"
                      wrap
                      style={{ minWidth: 0 }}
                    >
                      <DialogClose variant="secondary">
                        {label('取消编辑')}
                      </DialogClose>
                      <DialogClose onPress={save}>
                        {label('保存并关闭')}
                      </DialogClose>
                    </Stack>
                  )}
                >
                  {() => (
                    <Stack gap="md" style={{ minWidth: 0 }}>
                      <DialogTitle>{label('文档编辑')}</DialogTitle>
                      <DialogDescription>
                        {label(
                          '保存提交名称和可见性；取消会还原本次未保存的编辑。',
                        )}
                      </DialogDescription>
                      <TextField
                        aria-label={label('文档名称')}
                        value={state().draftName}
                        onValueChange={(value) => edit({ draftName: value })}
                        ref={(node) => {
                          input = node.element;
                        }}
                        style={rowStyle}
                      />
                      <Select
                        label={label('可见性')}
                        options={visibilityOptions}
                        value={state().visibility}
                        onValueChange={(value) =>
                          edit({ visibility: value ?? 'team' })
                        }
                        style={rowStyle}
                      >
                        {() => (
                          <View>
                            <SelectTrigger style={{ maxWidth: '100%' }} />
                            <SelectContent width={300} height={250} />
                          </View>
                        )}
                      </Select>
                      <Stack
                        direction="row"
                        gap="sm"
                        wrap
                        style={{ minHeight: 44, flexShrink: 0, minWidth: 0 }}
                      >
                        <Menu
                          label={label('文档操作')}
                          items={menuItems()}
                          onAction={(value) => {
                            if (!alive) return;
                            setState((current) => ({
                              ...current,
                              menuActions: current.menuActions + 1,
                              draftName:
                                value === 'duplicate'
                                  ? `${current.draftName} 副本`
                                  : current.draftName,
                            }));
                          }}
                        >
                          {() => (
                            <View>
                              <MenuTrigger variant="secondary">
                                {label('更多操作')}
                              </MenuTrigger>
                              <MenuContent width={300} height={230} />
                            </View>
                          )}
                        </Menu>
                        <Popover>
                          {() => (
                            <View>
                              <PopoverTrigger variant="secondary">
                                {label('编辑备注')}
                              </PopoverTrigger>
                              <PopoverContent
                                name={label('备注')}
                                width={320}
                                height={220}
                                actions={() => (
                                  <PopoverClose>
                                    {label('完成备注')}
                                  </PopoverClose>
                                )}
                              >
                                {() => (
                                  <TextField
                                    aria-label={label('备注草稿')}
                                    value={state().note}
                                    onValueChange={(value) =>
                                      edit({ note: value })
                                    }
                                  />
                                )}
                              </PopoverContent>
                            </View>
                          )}
                        </Popover>
                        <Tooltip>
                          {() => (
                            <View>
                              <TooltipTrigger variant="ghost">
                                {label('帮助')}
                              </TooltipTrigger>
                              <TooltipContent>
                                {label('编辑名称、选择可见性，再保存或取消。')}
                              </TooltipContent>
                            </View>
                          )}
                        </Tooltip>
                      </Stack>
                      <AlertDialog>
                        {() => (
                          <View style={rowStyle}>
                            <AlertDialogTrigger variant="danger">
                              {label('归档文档')}
                            </AlertDialogTrigger>
                            <AlertDialogContent
                              width={380}
                              height={280}
                              actions={() => (
                                <Stack direction="row" gap="sm" wrap>
                                  <AlertDialogCancel variant="secondary">
                                    {label('取消归档')}
                                  </AlertDialogCancel>
                                  <AlertDialogConfirm
                                    variant="danger"
                                    onPress={archive}
                                  >
                                    {label('确认归档')}
                                  </AlertDialogConfirm>
                                </Stack>
                              )}
                            >
                              {() => (
                                <Stack gap="md">
                                  <AlertDialogTitle>
                                    {label('确认归档')}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {label(
                                      '只有明确确认才增加归档计数；此示例不操作远程文档。',
                                    )}
                                  </AlertDialogDescription>
                                </Stack>
                              )}
                            </AlertDialogContent>
                          </View>
                        )}
                      </AlertDialog>
                    </Stack>
                  )}
                </DialogContent>
              </View>
            )}
          </Dialog>
          <Text style={textStyle()}>{summary()}</Text>
          <ToastViewport
            label={label('状态通知')}
            dismissLabel={label('关闭通知')}
            style={{
              width: '100%',
              height: 220,
              minHeight: 220,
              flexShrink: 0,
            }}
          />
        </Stack>
      </ScrollView>
    </Surface>
  );
}
