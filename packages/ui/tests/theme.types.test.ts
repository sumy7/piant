import { expectTypeOf, it } from 'vitest';
import {
  createTheme,
  type ThemeOverrides,
  UIProvider,
  useUITheme,
} from '../dist/index.js';

it('exports typed token leaves, provider options and read-only themes', () => {
  const theme = createTheme({
    theme: { colors: { primary: '#123456' }, motion: { fast: 30 } },
  });
  expectTypeOf(theme.colors.primary).toBeString();
  expectTypeOf(useUITheme()).toBeFunction();
  const errors = () => {
    // @ts-expect-error Unknown token leaves must not silently become theme API.
    const wrong: ThemeOverrides = { colors: { accentTypo: '#fff' } };
    // @ts-expect-error Resolved tokens are immutable.
    theme.colors.primary = 'red';
    // @ts-expect-error Only supported densities are accepted.
    UIProvider({ density: 'dense' });
    // @ts-expect-error Provider child creation must be lazy.
    UIProvider({ children: 'eager' });
    void wrong;
  };
  expectTypeOf(errors).toBeFunction();
});
