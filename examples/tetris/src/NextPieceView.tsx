import { For, StyleSheet, View } from '@piant/core';
import type { Piece } from './gameLogic';

interface NextPieceProps {
  piece: Piece | null;
}

const PREVIEW_CELL = 22;

const styles = StyleSheet.create({
  container: {
    width: PREVIEW_CELL * 4,
    height: PREVIEW_CELL * 4,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: PREVIEW_CELL,
    height: PREVIEW_CELL,
  },
  filled: {
    width: PREVIEW_CELL,
    height: PREVIEW_CELL,
    borderRadius: 3,
  },
});

const NextPieceView = (props: NextPieceProps) => {
  return (
    <View style={styles.container}>
      <For each={props.piece?.shape ?? []}>
        {(row) => (
          <View style={styles.row}>
            <For each={row}>
              {(cell) =>
                cell ? (
                  <View
                    style={{
                      ...styles.filled,
                      backgroundColor: props.piece!.color,
                    }}
                  />
                ) : (
                  <View style={styles.cell} />
                )
              }
            </For>
          </View>
        )}
      </For>
    </View>
  );
};

export default NextPieceView;
