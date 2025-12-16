import { Container } from '@mui/material';

import Footer from './footer';
import Navbar from './navbar';

const Layout = ({ children }) => (
  <>
    <Navbar />
    <Container maxWidth="xl" sx={{ marginTop: theme => theme.spacing(4) }}>
      <main>{children}</main>
      <Footer />
    </Container>
  </>
);

export default Layout;
