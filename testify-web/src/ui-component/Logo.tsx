// material-ui
import { useTheme } from '@mui/material/styles';

// ==============================|| LOGO ||============================== //

export default function Logo() {
  const theme = useTheme();

  return (
    <svg width="200" height="50" viewBox="0 0 200 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="paint0_linear" x1="0" y1="0" x2="200" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="1" stopColor={theme.palette.primary.main} />
        </linearGradient>
      </defs>
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="url(#paint0_linear)"
        fontSize="23"
        fontWeight="800"
        fontFamily="'Roboto', sans-serif"
        style={{ letterSpacing: '1px' }}
      >
        <tspan x="50%" dy="0.3em">
          Testify
        </tspan>
      </text>
    </svg>
  );
}
