import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-surface-alt border border-border text-text-secondary hover:text-accent hover:border-accent-light hover:bg-surface transition-all duration-300 ml-2 shadow-sm relative overflow-hidden group"
      aria-label="Toggle Theme"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      {theme === 'dark' ? (
        <SunIcon className="w-[1.2rem] h-[1.2rem] text-warning transition-transform group-hover:scale-110 group-hover:rotate-45 duration-300" />
      ) : (
        <MoonIcon className="w-[1.2rem] h-[1.2rem] text-indigo-500 transition-transform group-hover:scale-110 group-hover:-rotate-12 duration-300" />
      )}
    </button>
  );
}
