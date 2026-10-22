import {
  type AnimationGroup,
  animate,
  sequence,
  stagger,
} from '@piant/animation';
import { onCleanup, type PNode, Text, View } from '@piant/core';

export default function AnimationSequence() {
  const nodes: PNode[] = [];
  let group: AnimationGroup | undefined;
  onCleanup(() => group?.cancel());
  const replay = () => {
    group?.cancel();
    group = sequence([
      () =>
        stagger(
          nodes.map(
            (node) => () =>
              animate(
                node,
                [
                  { y: 0, alpha: 1 },
                  { y: -35, alpha: 0.4 },
                ],
                { duration: 450, fill: 'forwards' },
              ),
          ),
          160,
        ),
      () =>
        stagger(
          nodes.map(
            (node) => () =>
              animate(
                node,
                [
                  { y: -35, alpha: 0.4 },
                  { y: 0, alpha: 1 },
                ],
                { duration: 450, fill: 'forwards' },
              ),
          ),
          160,
        ),
    ]);
  };
  const button = {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
  } as const;
  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 25,
      }}
    >
      <View
        style={{ flexDirection: 'row', gap: 24, height: 90, paddingTop: 40 }}
      >
        {[0, 1, 2].map((index) => (
          <View
            ref={(node) => {
              nodes[index] = node;
            }}
            style={{
              width: 52,
              height: 45,
              borderRadius: 8,
              backgroundColor: '#14b8a6',
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={button} onClick={replay}>
          <Text style={{ color: '#ffffff' }}>运行 sequence + stagger</Text>
        </View>
        <View style={button} onClick={() => group?.cancel()}>
          <Text style={{ color: '#ffffff' }}>取消</Text>
        </View>
      </View>
    </View>
  );
}
