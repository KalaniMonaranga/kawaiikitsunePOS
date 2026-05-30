import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-area">
        <Header />
        <section className="page-content">{children}</section>
        <Footer />
      </main>
    </div>
  );
}

export default Layout;