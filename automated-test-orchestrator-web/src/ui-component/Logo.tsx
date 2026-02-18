// material-ui
import { useTheme } from '@mui/material/styles';

// project imports
import logo from 'assets/images/logo.png';

// ==============================|| LOGO ||============================== //

export default function Logo() {
  const theme: any = useTheme();

  return (
    <img src={logo} alt="RootStock" width="200" />
  );
}
