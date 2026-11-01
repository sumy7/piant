import {
  attachDOMElement,
  createEffect,
  createMemo,
  createState,
  onCleanup,
  type PInput,
  type PNode,
  root,
  Show,
  Text,
  untrack,
  View,
} from '@piant/core';
import {
  Badge,
  Button,
  Checkbox,
  type ColorMode,
  type ControlDensity,
  Field,
  Icon,
  IconButton,
  ProgressBar,
  RadioGroup,
  Separator,
  Spacer,
  Spinner,
  Stack,
  Surface,
  TextField,
  ToggleSwitch,
  UIProvider,
  useUITheme,
} from '@piant/ui';

export interface SettingsSnapshot {
  readonly name: string;
  readonly sound: boolean;
  readonly remember: boolean;
  readonly quality: string;
  readonly saving: boolean;
  readonly dirty: boolean;
  readonly saveCount: number;
  readonly status: string;
}

export interface SettingsPanelProps {
  colorMode?: ColorMode;
  density?: ControlDensity;
  fontScale?: number;
  reducedMotion?: boolean | 'system';
  title?: string;
  onStateChange?: (snapshot: SettingsSnapshot) => void;
}

type SettingsValues = Pick<
  SettingsSnapshot,
  'name' | 'sound' | 'remember' | 'quality'
>;
type PanelState = SettingsValues & {
  saved: SettingsValues;
  saving: boolean;
  saveCount: number;
  status: string;
  error?: string;
};
const defaults: SettingsValues = Object.freeze({
  name: '林小满',
  sound: true,
  remember: true,
  quality: 'balanced',
});
const qualityOptions = [
  { value: 'fast', label: '快速' },
  { value: 'balanced', label: '均衡' },
  { value: 'high', label: '高质量' },
] as const;

/** Reusable local-only settings workflow; no persistence, network or audio effects. */
export function SettingsPanel(
  props: SettingsPanelProps = {},
): ReturnType<typeof View> {
  let disposed = false;
  let stop = () => {};
  let removeDestroy = () => {};
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    removeDestroy();
  }
  const result = root((cleanup) => {
    stop = cleanup;
    // Enclosing JSX getters can settle before creating the isolated subtree.
    return createMemo(() =>
      untrack(() => (
        <UIProvider
          colorMode={props.colorMode}
          density={props.density}
          fontScale={props.fontScale}
          reducedMotion={props.reducedMotion}
          focusScope="isolate"
        >
          {() =>
            renderPanel(props, (node) => {
              removeDestroy = node.onDestroy(dispose);
            })
          }
        </UIProvider>
      )),
    );
  });
  onCleanup(dispose);
  return result;
}

function renderPanel(
  props: SettingsPanelProps,
  bindLifetime: (node: PNode) => void,
): ReturnType<typeof View> {
  const theme = useUITheme();
  const [state, setState] = createState<PanelState>({
    ...defaults,
    saved: defaults,
    saving: false,
    saveCount: 0,
    status: '调整偏好后，点击保存设置。',
  });
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let input: PInput | undefined;
  onCleanup(() => {
    alive = false;
    clearTimeout(timer);
    timer = undefined;
  });
  const dirty = () => {
    const current = state();
    const saved = current.saved;
    return (
      current.name !== saved.name ||
      current.sound !== saved.sound ||
      current.remember !== saved.remember ||
      current.quality !== saved.quality
    );
  };
  const badge = () =>
    state().saving
      ? '保存中'
      : dirty()
        ? '未保存'
        : state().saveCount > 0
          ? '已保存'
          : '已就绪';
  const title = () => props.title ?? '个人设置';
  const status = () => state().status;
  const caption = () => '仅在当前示例中模拟保存，不写入持久存储。';
  const normalText = () => ({
    fontFamily: theme().typography.fontFamily,
    fontSize: theme().typography.fontSize,
    lineHeight: theme().typography.lineHeight,
    color: theme().colors.text,
    minWidth: 0,
  });
  const smallText = () => ({
    ...normalText(),
    fontSize: theme().typography.smallFontSize,
    lineHeight: theme().typography.smallLineHeight,
    color: theme().colors.textMuted,
  });
  function edit(patch: Partial<SettingsValues>) {
    if (!alive || state().saving) return;
    setState((current) => ({
      ...current,
      ...patch,
      error: undefined,
      status: '尚未保存更改。',
    }));
  }
  function reset() {
    if (!alive || state().saving) return;
    setState((current) => ({
      ...current,
      ...defaults,
      error: undefined,
      status: '已恢复默认设置，点击保存以应用。',
    }));
  }
  function undo() {
    if (!alive || state().saving) return;
    setState((current) => ({
      ...current,
      ...current.saved,
      error: undefined,
      status: '已撤销未保存的更改。',
    }));
  }
  function save() {
    if (!alive || state().saving) return;
    const current = state();
    const name = current.name.trim();
    const length = Array.from(name).length;
    if (length < 2 || length > 24) {
      setState((previous) => ({
        ...previous,
        error: '显示名称应为 2–24 个字符。',
        status: '请检查显示名称后重试。',
      }));
      input?.focus();
      return;
    }
    const captured: SettingsValues = Object.freeze({
      name,
      sound: current.sound,
      remember: current.remember,
      quality: current.quality,
    });
    setState((previous) => ({
      ...previous,
      name,
      saving: true,
      error: undefined,
      status: '正在保存设置…',
    }));
    // A host diagnostic callback may synchronously unmount during this update.
    if (!alive) return;
    timer = setTimeout(() => {
      timer = undefined;
      if (!alive) return;
      setState((previous) => ({
        ...previous,
        saved: captured,
        saving: false,
        saveCount: previous.saveCount + 1,
        status: '设置已保存。',
      }));
    }, 1200);
  }
  const panel = (
    <Surface ref={bindLifetime} bordered style={{ width: '100%', minWidth: 0 }}>
      <Stack gap="md" style={{ width: '100%', minWidth: 0 }}>
        <Stack
          direction="row"
          align="center"
          gap="sm"
          style={{ width: '100%' }}
        >
          <Icon
            size={theme().typography.headingFontSize}
            draw={(graphics, width, height, color) => {
              const side = Math.min(width, height);
              graphics
                .circle(width / 2, height * 0.3, side * 0.16)
                .stroke({ color, width: 2 });
              graphics
                .beginPath()
                .arc(width / 2, height * 0.85, side * 0.3, Math.PI, Math.PI * 2)
                .stroke({ color, width: 2 });
            }}
          />
          <Text
            style={{
              ...normalText(),
              fontSize: theme().typography.headingFontSize,
              lineHeight: theme().typography.headingLineHeight,
              flex: 1,
            }}
          >
            {title()}
          </Text>
          <IconButton
            name="恢复默认设置"
            variant="ghost"
            disabled={state().saving}
            onPress={reset}
            icon={(context) => (
              <Icon
                size={context.size()}
                color={context.color()}
                draw={(graphics, width, height, color) => {
                  const radius = Math.min(width, height) * 0.3;
                  graphics
                    .arc(
                      width / 2,
                      height / 2,
                      radius,
                      Math.PI * 0.15,
                      Math.PI * 1.8,
                    )
                    .stroke({ color, width: 2 });
                  graphics
                    .moveTo(width * 0.8, height * 0.15)
                    .lineTo(width * 0.8, height * 0.4)
                    .lineTo(width * 0.55, height * 0.4)
                    .stroke({ color, width: 2 });
                }}
              />
            )}
          />
        </Stack>
        <Badge tone={dirty() ? 'neutral' : 'primary'}>{badge()}</Badge>
        <Separator />
        <Field
          label="显示名称"
          description="2–24 个字符，支持中文。"
          error={state().error}
          required
          style={{ width: '100%' }}
        >
          {() => (
            <TextField
              name="displayName"
              value={state().name}
              readOnly={state().saving}
              autoComplete="nickname"
              onValueChange={(value) => edit({ name: value })}
              ref={(node) => {
                input = node;
              }}
            />
          )}
        </Field>
        <ToggleSwitch
          label="声音提醒"
          checked={state().sound}
          disabled={state().saving}
          onCheckedChange={(sound) => edit({ sound })}
        />
        <Checkbox
          label="记住我的偏好"
          checked={state().remember}
          disabled={state().saving}
          onCheckedChange={(remember) => edit({ remember: remember === true })}
        />
        <RadioGroup
          label="导出质量"
          options={qualityOptions}
          value={state().quality}
          disabled={state().saving}
          onValueChange={(quality) => edit({ quality })}
          style={{ width: '100%' }}
        />
        <Separator />
        <ProgressBar
          label="设置保存进度"
          indeterminate={state().saving}
          value={state().saveCount > 0 ? 100 : 0}
        />
        <View
          ref={(node) => {
            const element = document.createElement('div');
            element.setAttribute('role', 'status');
            element.setAttribute('aria-live', 'polite');
            element.setAttribute('aria-atomic', 'true');
            element.style.cssText = 'opacity:0;pointer-events:none;';
            attachDOMElement(node, element);
            createEffect(() => {
              element.textContent = status();
            });
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme().spacing.sm,
            minWidth: 0,
          }}
        >
          <Show when={state().saving}>{(_saving) => <Spinner />}</Show>
          <Text style={{ ...normalText(), flex: 1 }}>{status()}</Text>
        </View>
        <Spacer size={theme().spacing.xs} />
        <Stack direction="row" wrap gap="sm" style={{ width: '100%' }}>
          <Button loading={state().saving} onPress={save}>
            保存设置
          </Button>
          <Button
            variant="secondary"
            disabled={state().saving || !dirty()}
            onPress={undo}
          >
            撤销更改
          </Button>
        </Stack>
        <Text style={smallText()}>{caption()}</Text>
      </Stack>
    </Surface>
  );
  createEffect(() => {
    const current = state();
    const snapshot: SettingsSnapshot = Object.freeze({
      name: current.name,
      sound: current.sound,
      remember: current.remember,
      quality: current.quality,
      saving: current.saving,
      dirty: dirty(),
      saveCount: current.saveCount,
      status: current.status,
    });
    const notify = props.onStateChange;
    untrack(() => notify?.(snapshot));
  });
  return panel;
}
