import { Img, onCleanup, Span, Text } from '@piant/core';
import { Graphics, type Renderer, Sprite } from 'pixi.js';

export function InlineImageExample(props: { renderer: Renderer }) {
  const graphics = new Graphics().svg(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">' +
      '<rect width="32" height="32" rx="8" fill="#2563eb"/>' +
      '<path d="M8 16h16M16 8v16" stroke="white" stroke-width="4"/>' +
      '</svg>',
  );
  const texture = props.renderer.generateTexture({ target: graphics });
  graphics.destroy();
  const sprite = new Sprite(texture);

  onCleanup(() => {
    sprite.destroy();
    texture.destroy(true);
  });

  return (
    <Text
      style={{ width: 200, fontSize: 16, lineHeight: 28, color: '#0f172a' }}
    >
      <Span>点击</Span>
      <Img src={texture} style={{ width: 16, height: 16 }} />
      <Span>图标，再用 Sprite 复用纹理</Span>
      <Img src={sprite} style={{ width: 24, height: 24 }} />
      <Span>，宽度不足时自动换行。</Span>
    </Text>
  );
}
