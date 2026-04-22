import {
  createState,
  Img,
  onMount,
  ScrollView,
  Show,
  Span,
  StyleSheet,
  Text,
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
            <Text style={styles.label}>
              <Span>Inline image</Span>
            </Text>
            <Show when={image()}>
              <Text
                style={{
                  fontSize: 20,
                  color: '#00aa55',
                }}
              >
                <Span style={{ fontSize: 40, color: 'red' }}>hello</Span>
                <Img src={image()}></Img>
                <Span style={{ fontSize: 15, color: 'blue' }}>world</Span>
              </Text>
            </Show>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <Span>Break all</Span>
            </Text>
            <Text
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
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <Span>Chinese wrapping</Span>
            </Text>
            <Text>
              <Span style={{ fontSize: 40, color: 'red' }}>短文本测试</Span>
              <Span style={{ fontSize: 15, color: 'blue' }}>
                这是一些中文文本，用于测试文本换行和显示效果。
              </Span>
              <Span style={{ fontSize: 15, color: 'green' }}>
                这里有更多的中文内容，看看它是如何在不同的宽度下进行换行的。
              </Span>
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <Span>Alignment</Span>
            </Text>
            <Text style={{ textAlign: 'center' }}>
              <Span style={{ fontSize: 40, color: 'red' }}>Centered Text</Span>
              <Span style={{ fontSize: 15, color: 'blue' }}>
                This text should be centered within the Text component.
              </Span>
            </Text>
            <Text style={{ textAlign: 'right' }}>
              <Span style={{ fontSize: 40, color: 'red' }}>
                Right Aligned Text
              </Span>
              <Span style={{ fontSize: 15, color: 'blue' }}>
                This text should be aligned to the right within the Text
                component.
              </Span>
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <Span>Line height and letter spacing</Span>
            </Text>
            <Text style={{ fontSize: 20, color: 'purple', lineHeight: 40 }}>
              <Span>
                Line height test: This text should have a line height of 40
                pixels, making the lines more spaced out than usual.
              </Span>
              <Span style={{ fontSize: 40 }}> 40 Aj </Span>
              <Span>
                Another line to demonstrate the effect of line height on text
                layout.
              </Span>
            </Text>
            <Text style={{ fontSize: 20, color: 'brown', letterSpacing: 5 }}>
              <Span>letterSpacing: 5 — slightly wider character gaps.</Span>
            </Text>
            <Text style={{ fontSize: 20, color: '#0055aa', letterSpacing: 10 }}>
              <Span>letterSpacing: 10 — notably wider gaps, wraps earlier.</Span>
            </Text>
            <Text
              style={{
                fontSize: 20,
                color: '#008855',
                letterSpacing: 5,
                textAlign: 'center',
              }}
            >
              <Span>letterSpacing + center align</Span>
            </Text>
            <Text
              style={{
                fontSize: 20,
                color: '#aa0055',
                lineClamp: 1,
                textOverflow: 'ellipsis',
                letterSpacing: 6,
              }}
            >
              <Span>letterSpacing + ellipsis clamp: long text gets cut off here</Span>
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <Span>Vertical align</Span>
            </Text>
            <Show when={image()}>
              <Text style={{ fontSize: 18, lineHeight: 72, color: '#0f172a' }}>
                <Span style={{ verticalAlign: 'top', color: '#ef4444' }}>
                  [top]
                </Span>
                <Img
                  src={image()}
                  style={{ verticalAlign: 'top', width: 36, height: 36 }}
                ></Img>
                <Span
                  style={{
                    fontSize: 42,
                    color: '#1d4ed8',
                    verticalAlign: 'top',
                  }}
                >
                  A
                </Span>
              </Text>

              <Text style={{ fontSize: 18, lineHeight: 72, color: '#0f172a' }}>
                <Span style={{ verticalAlign: 'middle', color: '#f59e0b' }}>
                  [middle]
                </Span>
                <Img
                  src={image()}
                  style={{ verticalAlign: 'middle', width: 36, height: 36 }}
                ></Img>
                <Span
                  style={{
                    fontSize: 42,
                    color: '#7c3aed',
                    verticalAlign: 'middle',
                  }}
                >
                  A
                </Span>
              </Text>

              <Text style={{ fontSize: 18, lineHeight: 72, color: '#0f172a' }}>
                <Span style={{ verticalAlign: 'bottom', color: '#16a34a' }}>
                  [bottom]
                </Span>
                <Img
                  src={image()}
                  style={{ verticalAlign: 'bottom', width: 36, height: 36 }}
                ></Img>
                <Span
                  style={{
                    fontSize: 42,
                    color: '#0f766e',
                    verticalAlign: 'bottom',
                  }}
                >
                  A
                </Span>
              </Text>

              <Text style={{ fontSize: 18, lineHeight: 72, color: '#0f172a' }}>
                <Span style={{ verticalAlign: 'baseline', color: '#6b7280' }}>
                  [baseline]
                </Span>
                <Img
                  src={image()}
                  style={{ verticalAlign: 'baseline', width: 36, height: 36 }}
                ></Img>
                <Span
                  style={{
                    fontSize: 42,
                    color: '#111827',
                    verticalAlign: 'baseline',
                  }}
                >
                  A
                </Span>
              </Text>
            </Show>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <Span>Transforms</Span>
            </Text>
            <Text
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
            </Text>
            <Text
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
            </Text>
            <Text
              style={{
                fontSize: 20,
                color: 'black',
                textTransform: 'capitalize',
              }}
            >
              <Span>Text Transform test: this text should be Capitalized.</Span>
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <Span>Text overflow</Span>
            </Text>

            <Text
              style={{
                fontSize: 18,
                color: '#0f172a',
                lineHeight: 28,
                textOverflow: 'clip',
                lineClamp: 2,
                backgroundColor: '#f1f5f9',
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Span>
                Clip (2 lines): This paragraph is intentionally long and will be
                clamped after two lines without showing an ellipsis marker.
              </Span>
            </Text>

            <Text
              style={{
                fontSize: 18,
                color: '#0f172a',
                lineHeight: 28,
                textOverflow: 'ellipsis',
                lineClamp: 2,
                backgroundColor: '#f1f5f9',
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Span>
                Ellipsis (2 lines): This paragraph should end with an ellipsis
                once the visible area reaches the configured line clamp.
              </Span>
            </Text>

            <Text
              style={{
                fontSize: 18,
                color: '#0f172a',
                lineHeight: 28,
                textOverflow: 'ellipsis',
                lineClamp: 1,
                backgroundColor: '#f1f5f9',
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Span>
                Ellipsis (1 line): Single line clamp for quick title-style
                truncation in narrow containers.
              </Span>
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default TextList;
