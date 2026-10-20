import { Application, Container, Graphics, Rectangle, Sprite } from 'pixi.js';
import type { ImageStyles } from '../src/elements/layout/viewStyles';
import { PImage } from '../src/elements/PImage';
import { PView } from '../src/elements/PView';

const result = document.querySelector('#result')!;
const checks: string[] = [];
function assert(condition: boolean, description: string) {
  if (!condition) throw new Error(description);
  checks.push(description);
}
try {
  const app = new Application();
  await app.init({
    width: 600,
    height: 240,
    preference: 'webgl',
    background: 'white',
    antialias: false,
    resolution: 1,
  });
  app.stop();
  document.querySelector('#canvas')!.append(app.canvas);
  assert(app.renderer.name === 'webgl', `Renderer: ${app.renderer.name}`);
  const white = [255, 255, 255, 255],
    red = [255, 0, 0, 255],
    blue = [0, 0, 255, 255],
    green = [0, 255, 0, 255];
  app.stage.addChild(new Graphics().rect(0, 0, 600, 240).fill('white'));
  const fixture = new Container();
  app.stage.addChild(fixture);
  const node = new PImage();
  fixture.addChild(node._view);
  const geometry = new Graphics().rect(-100, -50, 200, 100).fill('red');
  const textureGraphic = new Graphics().rect(0, 0, 200, 100).fill('red');
  const texture = app.renderer.generateTexture({ target: textureGraphic });
  textureGraphic.destroy();
  const borrowedSprite = new Sprite(texture);
  function layout(styles: ImageStyles = {}) {
    node.setStyle({
      position: 'absolute',
      left: 200,
      top: 50,
      width: 100,
      height: 100,
      ...styles,
    });
    node._layoutNode.calculateLayout(undefined, undefined);
    node.applyLayout();
  }
  function pixels() {
    app.renderer.render(app.stage);
    return app.renderer.extract.pixels({
      target: app.stage,
      frame: new Rectangle(0, 0, 600, 240),
    }).pixels;
  }
  function color(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    expected: number[],
    description: string,
  ) {
    const actual = Array.from(
      data.slice((y * 600 + x) * 4, (y * 600 + x) * 4 + 4),
    );
    assert(
      actual.length === 4 && actual.every((v, i) => v === expected[i]),
      `${description}: ${actual}`,
    );
  }
  const child = new PView();
  child.setStyle({
    position: 'absolute',
    left: 120,
    top: 30,
    width: 20,
    height: 20,
    backgroundColor: '#00ff00',
  });
  node.appendChild(child);
  for (const source of [geometry, borrowedSprite]) {
    node.setStyle({
      borderWidth: 0,
      backgroundColor: 'transparent',
      borderTopLeftRadius: undefined,
      borderTopRightRadius: undefined,
      borderBottomRightRadius: undefined,
      borderBottomLeftRadius: undefined,
    });
    node.setImage(source);
    layout({ objectFit: 'cover', overflow: 'visible', borderRadius: 0 });
    let data = pixels();
    color(data, 175, 100, white, 'cover clips left overflow');
    color(data, 325, 100, white, 'cover clips right overflow');
    color(data, 250, 100, red, 'cover fills center');
    color(data, 330, 90, green, 'cover leaves child overflow visible');
    layout({ objectFit: 'cover', overflow: 'hidden', borderRadius: 20 });
    data = pixels();
    color(data, 330, 90, white, 'overflow hidden clips child');
    color(data, 201, 51, white, 'nested rounded masks clip corner');
    color(data, 250, 100, red, 'nested masks preserve image center');
    layout({
      objectFit: 'cover',
      overflow: 'visible',
      borderRadius: 0,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    });
    data = pixels();
    color(data, 201, 51, white, 'per-corner cover mask clips top left');
    color(data, 298, 51, red, 'per-corner cover mask retains top right');
    layout({
      objectFit: 'contain',
      overflow: 'visible',
      borderRadius: 0,
      borderTopLeftRadius: 0,
      backgroundColor: 'blue',
    });
    data = pixels();
    color(data, 250, 60, blue, 'contain exposes background');
    color(data, 250, 100, red, 'contain centers image');
    layout({ objectFit: 'fill' });
    data = pixels();
    color(data, 250, 60, red, 'fill stretches to full height');
    layout({ objectFit: 'none' });
    data = pixels();
    color(
      data,
      350,
      100,
      red,
      'none restores original width and removes cover mask',
    );
    layout({ objectFit: 'contain', width: 150, height: 80 });
    data = pixels();
    color(data, 250, 51, blue, 'resized contain has top letterbox');
    color(data, 250, 90, red, 'resized contain preserves aspect ratio');
    for (let i = 0; i < 10; i++) {
      layout({ objectFit: 'cover', width: 100, height: 100 });
      pixels();
    }
    data = pixels();
    color(data, 175, 100, white, 'ten repeated layouts remain clipped');
    color(data, 250, 100, red, 'ten repeated layouts retain center');
    layout({ objectFit: 'cover', width: 0, height: 0 });
    pixels();
    layout({ objectFit: 'cover', width: 100, height: 100 });
    data = pixels();
    color(data, 250, 100, red, 'image recovers from collapsed container');
    // A larger CSS border leaves visible background outside a smaller contained image.
    layout({
      objectFit: 'contain',
      width: 100,
      height: 100,
      borderWidth: 10,
      borderColor: '#00ff00',
      backgroundColor: 'blue',
    });
    data = pixels();
    color(data, 205, 55, green, 'contain preserves visible border');
    color(data, 250, 65, blue, 'contain preserves background inside border');
    color(data, 250, 100, red, 'contain renders over background');
  }
  node.setImage(new Graphics());
  layout({ objectFit: 'cover', borderWidth: 0 });
  let data = pixels();
  color(data, 250, 100, blue, 'empty Graphics hides stale image');
  const finalGeometry = new Graphics().rect(0, 0, 100, 200).fill('red');
  node.setImage(finalGeometry);
  layout({ objectFit: 'cover', width: 100, height: 100 });
  data = pixels();
  color(data, 250, 25, white, 'replacement portrait clips top');
  color(data, 250, 175, white, 'replacement portrait clips bottom');
  color(data, 250, 100, red, 'replacement portrait renders center');
  const mask = node._imageContent.mask as Graphics;
  const maskContext = mask.context;
  node.destroyRecursive();
  for (let i = 0; i < 6; i++) app.renderer.render(app.stage);
  assert(
    mask.destroyed && maskContext.destroyed,
    'owned mask and context destroyed',
  );
  assert(
    !geometry.destroyed &&
      !borrowedSprite.destroyed &&
      !texture.destroyed &&
      !texture.source.destroyed,
    'borrowed sources and texture survive disposal',
  );
  assert(!finalGeometry.parent, 'borrowed current source detached on disposal');
  node.destroy();
  // Show final comparison row after teardown checks.
  for (const [index, fit] of (
    ['cover', 'contain', 'fill', 'none'] as const
  ).entries()) {
    const image = new PImage();
    image.setImage(new Graphics().rect(0, 0, 200, 100).fill('red'));
    const style: ImageStyles = {
      position: 'absolute',
      left: 30 + index * 140,
      top: 65,
      width: 100,
      height: 100,
      objectFit: fit,
      backgroundColor: 'blue',
      borderRadius: 12,
    };
    image.setStyle(style);
    image._layoutNode.calculateLayout(undefined, undefined);
    image.applyLayout();
    app.stage.addChild(image._view);
  }
  app.renderer.render(app.stage);
  result.textContent = JSON.stringify(
    { passed: checks.length, checks },
    null,
    2,
  );
} catch (error) {
  result.textContent = `FAILED: ${error}\n${JSON.stringify(checks, null, 2)}`;
  console.error(error);
}
