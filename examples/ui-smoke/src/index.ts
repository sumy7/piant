import { createState, mount, PNode, View } from '@piant/core';
import { Spacer, type SpacerProps } from '@piant/ui';

const host = document.createElement('div');
host.style.cssText = 'width:320px;height:100px;background:#18202e';
document.body.append(host);
const status = document.createElement('p');
status.textContent = 'Mounting';
document.body.append(status);
const update = document.createElement('button');
update.textContent = 'Increase gap';
const destroy = document.createElement('button');
destroy.textContent = 'Unmount';
document.body.append(update, destroy);

let setSize!: (size: number) => void;
let gap!: PNode;
let reads = 0;
const mounted = await mount(() => {
  const [size, set] = createState(20);
  setSize = set;
  const props: SpacerProps = {
    get size() {
      reads++;
      return size();
    },
  };
  gap = Spacer(props) as PNode;
  return View({
    style: {
      width: 320,
      height: 100,
      flexDirection: 'row',
      alignItems: 'center',
    },
    children: [
      View({ style: { width: 40, height: 40, backgroundColor: '#34d399' } }),
      gap,
      View({ style: { width: 40, height: 40, backgroundColor: '#60a5fa' } }),
    ],
  });
}, host);

function report() {
  mounted.root.doLayout();
  const width = gap._layoutNode.getComputedWidth();
  if (!(gap instanceof PNode)) throw new Error('Duplicate core runtime');
  status.textContent = `Rendered: gap=${width}; single core=true`;
  return width;
}
if (report() !== 20) throw new Error('Initial layout failed');
update.onclick = () => {
  setSize(80);
  if (report() !== 80) throw new Error('Reactive update failed');
};
destroy.onclick = () => {
  mounted.destroy();
  const previousReads = reads;
  setSize(10);
  if (
    !mounted.isDestroyed ||
    !gap.isDestroyed ||
    host.querySelector('canvas') ||
    reads !== previousReads
  ) {
    throw new Error('Unmount/disposal failed');
  }
  status.textContent =
    'Unmounted: canvas removed; node destroyed; reactive subscriptions disposed';
  update.disabled = true;
  destroy.disabled = true;
};
