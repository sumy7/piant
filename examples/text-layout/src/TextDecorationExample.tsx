import { createState, Img, Span, Text, View } from '@piant/core';
import { Texture } from 'pixi.js';

export function TextDecorationExample() {
  const [decorated, setDecorated] = createState(true);
  const decoration = () => (decorated() ? 'underline line-through' : 'none');
  const toggleLabel = () =>
    decorated()
      ? 'Decoration: ON — click to clear'
      : 'Decoration: OFF — click to restore';

  return (
    <View
      style={{
        width: '100%',
        gap: 8,
        padding: 12,
        backgroundColor: '#ffffff',
        borderRadius: 12,
      }}
    >
      <View
        onClick={() => setDecorated((value) => !value)}
        style={{ padding: 8, backgroundColor: '#dbeafe', borderRadius: 6 }}
      >
        <Text style={{ fontSize: 15, color: '#1e40af' }}>{toggleLabel()}</Text>
      </View>
      <Text
        style={{
          fontSize: 20,
          lineHeight: 34,
          color: '#1d4ed8',
          textDecoration: decoration(),
        }}
      >
        <Span>
          Inherited{' '}
          <Span style={{ fontFamily: 'serif', fontSize: 27 }}>serif</Span>{' '}
        </Span>
        <Span style={{ textDecoration: 'none', color: '#64748b' }}>none </Span>
        <Span style={{ textDecoration: 'underline', color: '#15803d' }}>
          underline{' '}
        </Span>
        <Span style={{ textDecoration: 'line-through', color: '#be123c' }}>
          strike
        </Span>
      </Text>
      <Text
        style={{
          fontSize: 32,
          lineHeight: 20,
          color: '#334155',
          textDecoration: decoration(),
        }}
      >
        <Span>ABC</Span>
      </Text>
      <Text
        style={{
          width: 310,
          fontSize: 18,
          lineHeight: 28,
          color: '#7c3aed',
          letterSpacing: 2,
          textAlign: 'center',
          textDecoration: decoration(),
        }}
      >
        <Span>Centered wrapping with letter spacing and mixed </Span>
        <Span style={{ fontFamily: 'monospace', fontSize: 22 }}>fonts</Span>
      </Text>
      <Text
        style={{
          width: '100%',
          fontSize: 18,
          color: '#0f766e',
          backgroundColor: '#f0fdfa',
          textAlign: 'right',
          textDecoration: decoration(),
        }}
      >
        <Span>Right aligned: image </Span>
        <Img src={Texture.WHITE} style={{ width: 18, height: 18 }} />
        <Span> stays undecorated</Span>
      </Text>
      <Text
        style={{
          width: 310,
          fontSize: 18,
          color: '#b45309',
          lineClamp: 1,
          textOverflow: 'ellipsis',
          letterSpacing: 1,
          textDecoration: decoration(),
        }}
      >
        <Span>
          Ellipsis keeps decoration from the truncated source text and hides the
          remaining content.
        </Span>
      </Text>
    </View>
  );
}
