import { createState, Img, onCleanup, Span, Text, View } from '@piant/core';
import { Texture } from 'pixi.js';

export default function App() {
  const [expanded, setExpanded] = createState(false);
  const buttonLabel = () => (expanded() ? '收起为两行' : '展开全文');
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建行内图标');
  context.fillStyle = '#4f46e5';
  context.fillRect(0, 0, 24, 24);
  context.fillStyle = '#ffffff';
  context.font = 'bold 18px Arial';
  context.fillText('P', 6, 19);
  const icon = Texture.from(canvas);
  onCleanup(() => icon.destroy(true));

  return (
    <View style={{ width: '100%', height: '100%', padding: 20, gap: 16 }}>
      <Text style={{ fontSize: 20, color: '#0f172a', lineHeight: 30 }}>
        <Img
          src={icon}
          style={{ width: 24, height: 24, verticalAlign: 'middle' }}
        />
        <Span bold style={{ color: '#4f46e5' }}>
          {' '}
          Piant 富文本
        </Span>
      </Text>
      <Text
        style={{
          width: '100%',
          maxWidth: 360,
          fontSize: 16,
          color: '#334155',
          lineHeight: 26,
          lineClamp: expanded() ? 0 : 2,
          textOverflow: 'ellipsis',
        }}
      >
        在同一段文字里组合<Span bold>粗体</Span>、
        <Span italic style={{ color: '#be123c' }}>
          彩色斜体
        </Span>
        和行内图片。
        文字会随预览宽度自动换行。点击下方按钮，可以对比两行截断和完整段落的排版效果。
      </Text>
      <View
        style={{
          width: 156,
          height: 40,
          borderRadius: 8,
          backgroundColor: '#4f46e5',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => setExpanded((value) => !value)}
      >
        <Text style={{ fontSize: 16, color: '#ffffff' }}>{buttonLabel()}</Text>
      </View>
    </View>
  );
}
