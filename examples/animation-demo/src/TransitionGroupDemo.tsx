import '@piant/animation';
import { For, StyleSheet, Text, TransitionGroup, View, createState } from '@piant/core';

const COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
];

interface ListItem {
  id: number;
  label: string;
  color: string;
}

let nextId = 1;

function createItem(): ListItem {
  const id = nextId++;
  return {
    id,
    label: `Item #${id}`,
    color: COLORS[(id - 1) % COLORS.length],
  };
}

const INITIAL_ITEMS: ListItem[] = [createItem(), createItem(), createItem()];

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 20,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  desc: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addBtn: {
    paddingLeft: 28,
    paddingRight: 28,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  clearBtn: {
    paddingLeft: 28,
    paddingRight: 28,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 10,
    backgroundColor: '#475569',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  listArea: {
    width: 320,
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 10,
    paddingLeft: 16,
    paddingRight: 12,
    gap: 12,
  },
  itemDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyHint: {
    width: 320,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#1e293b',
  },
  emptyText: {
    fontSize: 14,
    color: '#475569',
  },
});

interface ItemViewProps {
  item: ListItem;
  onRemove: (id: number) => void;
}

function ItemView({ item, onRemove }: ItemViewProps) {
  return (
    <View style={{ ...styles.item, backgroundColor: item.color }}>
      <View style={styles.itemDot} />
      <Text style={styles.itemLabel}>{item.label}</Text>
      <View style={styles.removeBtn} onClick={() => onRemove(item.id)}>
        <Text style={styles.removeBtnText}>×</Text>
      </View>
    </View>
  );
}

export function TransitionGroupDemo() {
  const [items, setItems] = createState<ListItem[]>(INITIAL_ITEMS);

  const addItem = () => {
    setItems([...items(), createItem()]);
  };

  const removeItem = (id: number) => {
    setItems(items().filter((i) => i.id !== id));
  };

  const clearItems = () => {
    setItems([]);
  };

  const DURATION = 320;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>TransitionGroup 组件</Text>
      <Text style={styles.desc}>添加 / 删除列表项，体验进入 / 离开动画</Text>

      <View style={styles.btnRow}>
        <View style={styles.addBtn} onClick={addItem}>
          <Text style={styles.addBtnText}>+ 添加</Text>
        </View>
        <View style={styles.clearBtn} onClick={clearItems}>
          <Text style={styles.clearBtnText}>清空</Text>
        </View>
      </View>

      <View style={styles.listArea}>
        {TransitionGroup({
          appear: true,
          onBeforeEnter: (el) => {
            el.alpha = 0;
            el._animTranslate.x = -30;
            el.markDirty();
          },
          onEnter: (el, done) => {
            el.animate(
              [{ alpha: 0, x: -30 }, { alpha: 1, x: 0 }],
              { duration: DURATION, easing: 'ease-out', fill: 'forwards' },
            ).finished.then(done);
          },
          onAfterEnter: (el) => {
            el.alpha = 1;
            el._animTranslate.x = 0;
            el.markDirty();
          },
          onExit: (el, done) => {
            el.animate(
              [{ alpha: 1, x: 0 }, { alpha: 0, x: 30 }],
              { duration: DURATION, easing: 'ease-in', fill: 'forwards' },
            ).finished.then(done);
          },
          children: For({
            get each() {
              return items();
            },
            children: (item) =>
              ItemView({ item, onRemove: removeItem }),
          }),
        })}
      </View>

      {items().length === 0 && (
        <View style={styles.emptyHint}>
          <Text style={styles.emptyText}>列表为空，点击"+ 添加"</Text>
        </View>
      )}
    </View>
  );
}
