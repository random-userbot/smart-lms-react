import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-all relative group"
      style={{
        color: 'var(--color-text-secondary)',
        background: 'transparent',
      }}
      aria-label="Toggle Theme"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? (
        <SunIcon className="w-[18px] h-[18px] transition-transform group-hover:scale-110 group-hover:rotate-45 duration-300" style={{ color: 'var(--color-warning)' }} />
      ) : (
        <MoonIcon className="w-[18px] h-[18px] transition-transform group-hover:scale-110 group-hover:-rotate-12 duration-300" style={{ color: 'var(--color-accent)' }} />
      )}
    </button>
  );
}
