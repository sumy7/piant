import {
  createState,
  ImageSpan,
  onMount,
  ScrollView,
  Show,
  Span,
  StyleSheet,
  TextView,
  View,
} from '@piant/core';
import { Assets, Sprite } from 'pixi.js';
import BunnyImg from './bunny.png?url';

const TextList = () => {
  const [image, setImage] = createState<Sprite | null>(null);

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      gap: 16,
    },
    section: {
      gap: 8,
      padding: 16,
      backgroundColor: '#ffffff',
      borderRadius: 12,
    },
    label: {
      fontSize: 13,
      color: '#64748b',
      fontWeight: 'bold',
    },
  });

  onMount(async () => {
    const texture = await Assets.load(BunnyImg);
    const sprite = new Sprite(texture);
    sprite.width = 50;
    sprite.height = 50;
    setImage(sprite);
  });

  return (
    <View>
      <ScrollView>
        <View style={styles.container}>
          <View style={styles.section}>
            <TextView style={styles.label}>
              <Span>Inline image</Span>
            </TextView>
            <Show when={image()}>
              <TextView
                style={{
                  fontSize: 20,
                  color: '#00aa55',
                }}
              >
                <Span style={{ fontSize: 40, color: 'red' }}>hello</Span>
                <ImageSpan src={image()}></ImageSpan>
                <Span style={{ fontSize: 15, color: 'blue' }}>world</Span>
              </TextView>
            </Show>
          </View>

          <View style={styles.section}>
            <TextView style={styles.label}>
              <Span>Break all</Span>
            </TextView>
            <TextView
              style={{
                fontSize: 50,
                color: '#00ff00',
                wordBreak: 'break-all',
              }}
            >
              <Span style={{ fontSize: 40, color: 'red' }}>
                hello world
                <Span style={{ fontSize: 15, color: 'blue' }}>world </Span>
              </Span>
              <Span style={{ fontSize: 15, color: 'blue' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>world </Span>
            </TextView>
          </View>

          <View style={styles.section}>
            <TextView style={styles.label}>
              <Span>Chinese wrapping</Span>
            </TextView>
            <TextView>
              <Span style={{ fontSize: 40, color: 'red' }}>短文本测试</Span>
              <Span style={{ fontSize: 15, color: 'blue' }}>
                这是一些中文文本，用于测试文本换行和显示效果。
              </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>
                这里有更多的中文内容，看看它是如何在不同的宽度下进行换行的。
              </Span>
            </TextView>
          </View>

          <View style={styles.section}>
            <TextView style={styles.label}>
              <Span>Alignment</Span>
            </TextView>
            <TextView style={{ textAlign: 'center' }}>
              <Span style={{ fontSize: 40, color: 'red' }}>Centered Text</Span>
              <Span style={{ fontSize: 15, color: 'blue' }}>
                This text should be centered within the TextView component.
              </Span>
            </TextView>
            <TextView style={{ textAlign: 'right' }}>
              <Span style={{ fontSize: 40, color: 'red' }}>
                Right Aligned Text
              </Span>
              <Span style={{ fontSize: 15, color: 'blue' }}>
                This text should be aligned to the right within the TextView
                component.
              </Span>
            </TextView>
          </View>

          <View style={styles.section}>
            <TextView style={styles.label}>
              <Span>Line height and letter spacing</Span>
            </TextView>
            <TextView style={{ fontSize: 20, color: 'purple', lineHeight: 40 }}>
              <Span>
                Line height test: This text should have a line height of 40
                pixels, making the lines more spaced out than usual.
              </Span>
              <Span style={{ fontSize: 40 }}> 40 Aj </Span>
              <Span>
                Another line to demonstrate the effect of line height on text
                layout.
              </Span>
            </TextView>
            <TextView
              style={{ fontSize: 20, color: 'brown', letterSpacing: 5 }}
            >
              <Span>
                Letter spacing test: The letters in this text should be spaced
                out by 5 pixels, making it easier to read and visually
                appealing.
              </Span>
            </TextView>
          </View>

          <View style={styles.section}>
            <TextView style={styles.label}>
              <Span>Vertical align</Span>
            </TextView>
            <Show when={image()}>
              <TextView
                style={{ fontSize: 18, lineHeight: 72, color: '#0f172a' }}
              >
                <Span style={{ verticalAlign: 'top', color: '#ef4444' }}>
                  [top]
                </Span>
                <ImageSpan
                  src={image()}
                  style={{ verticalAlign: 'top', width: 36, height: 36 }}
                ></ImageSpan>
                <Span
                  style={{
                    fontSize: 42,
                    color: '#1d4ed8',
                    verticalAlign: 'top',
                  }}
                >
                  A
                </Span>
              </TextView>

              <TextView
                style={{ fontSize: 18, lineHeight: 72, color: '#0f172a' }}
              >
                <Span style={{ verticalAlign: 'middle', color: '#f59e0b' }}>
                  [middle]
                </Span>
                <ImageSpan
                  src={image()}
                  style={{ verticalAlign: 'middle', width: 36, height: 36 }}
                ></ImageSpan>
                <Span
                  style={{
                    fontSize: 42,
                    color: '#7c3aed',
                    verticalAlign: 'middle',
                  }}
                >
                  A
                </Span>
              </TextView>

              <TextView
                style={{ fontSize: 18, lineHeight: 72, color: '#0f172a' }}
              >
                <Span style={{ verticalAlign: 'bottom', color: '#16a34a' }}>
                  [bottom]
                </Span>
                <ImageSpan
                  src={image()}
                  style={{ verticalAlign: 'bottom', width: 36, height: 36 }}
                ></ImageSpan>
                <Span
                  style={{
                    fontSize: 42,
                    color: '#0f766e',
                    verticalAlign: 'bottom',
                  }}
                >
                  A
                </Span>
              </TextView>

              <TextView
                style={{ fontSize: 18, lineHeight: 72, color: '#0f172a' }}
              >
                <Span style={{ verticalAlign: 'baseline', color: '#6b7280' }}>
                  [baseline]
                </Span>
                <ImageSpan
                  src={image()}
                  style={{ verticalAlign: 'baseline', width: 36, height: 36 }}
                ></ImageSpan>
                <Span
                  style={{
                    fontSize: 42,
                    color: '#111827',
                    verticalAlign: 'baseline',
                  }}
                >
                  A
                </Span>
              </TextView>
            </Show>
          </View>

          <View style={styles.section}>
            <TextView style={styles.label}>
              <Span>Transforms and overflow</Span>
            </TextView>
            <TextView
              style={{
                fontSize: 20,
                color: 'black',
                textTransform: 'uppercase',
              }}
            >
              <Span>
                Text Transform test: this text should be transformed to
                uppercase.
              </Span>
            </TextView>
            <TextView
              style={{
                fontSize: 20,
                color: 'black',
                textTransform: 'lowercase',
              }}
            >
              <Span>
                Text Transform test: THIS TEXT SHOULD BE TRANSFORMED TO
                LOWERCASE.
              </Span>
            </TextView>
            <TextView
              style={{
                fontSize: 20,
                color: 'black',
                textTransform: 'capitalize',
              }}
            >
              <Span>Text Transform test: this text should be Capitalized.</Span>
            </TextView>
            <TextView
              style={{
                width: 320,
                fontSize: 20,
                color: 'white',
                textOverflow: 'ellipsis',
                lineClamp: 2,
              }}
            >
              <Span>
                Text Overflow test: This is a long text that is supposed to
                demonstrate the text overflow behavior when the content exceeds
                the specified width of the TextView component. It should be
                truncated with an ellipsis if it does not fit within the given
                space.
              </Span>
            </TextView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default TextList;
