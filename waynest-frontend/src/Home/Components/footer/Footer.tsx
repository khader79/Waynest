import { Link } from "react-router-dom";
import "./Footer.css";
import FooterLogic from "./FooterLogic";

const Footer = () => {
  const { hideFooter } = FooterLogic();

  if (hideFooter) return null;

  return (
    <footer className="footer">
      <h1 className="footerLeft">
        <Link to="/">Waynest</Link>
      </h1>

      <ul className="footerRight">
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/services">Services</Link>
        </li>
        <li>
          <Link to="/trips">Trips</Link>
        </li>
        <li>
          <Link to="/about">About</Link>
        </li>
      </ul>
    </footer>
  );
};

export default Footer;
