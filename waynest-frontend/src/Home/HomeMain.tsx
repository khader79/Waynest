import { useEffect } from "react";
import Footer from "./Components/footer/Footer";
import Navbar from "./Components/navbar/Navbar";

const HomeMain = ({ children }: any) => {
  useEffect(() => {
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    localStorage.removeItem("status");
    localStorage.removeItem("token");
  }, []);
  return (
    <div>
      <Navbar />
      {children}
      <Footer />
    </div>
  );
};

export default HomeMain;
