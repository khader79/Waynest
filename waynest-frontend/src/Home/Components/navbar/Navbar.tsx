"use client";
import { Link } from "react-router-dom";
import { GiHamburgerMenu } from "react-icons/gi";
import { CgClose } from "react-icons/cg";
import "./Navbar.css";
import NavbarLogic from "./NavbarLogic";

const Navbar = () => {
  const { open, setOpen, hasInteracted, toggleOpen } = NavbarLogic();

  const closeMenu = () => setOpen(false);

  return (
    <>
      <nav className="navbar">
        <div className="navLeft">
          <h1>
            <Link to="/">Waynest</Link>
          </h1>
        </div>
        <ul className="navRight">
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

          <Link to="/login">
            <button className="LoginButton">Login</button>
          </Link>
        </ul>
      </nav>

      <nav className="navbarMobile">
        <div className="navLeft">
          <h1>
            <Link to="/">Waynest</Link>
          </h1>
        </div>
        <div className="mobileMenuIcon" onClick={toggleOpen}>
          {open ? (
            <CgClose style={{ color: "black", cursor: "pointer" }} />
          ) : (
            <GiHamburgerMenu style={{ color: "black", cursor: "pointer" }} />
          )}
        </div>
      </nav>

      <ul
        className={`navRight mobileMenu ${
          hasInteracted ? (open ? "show" : "hide") : ""
        }`}
      >
        <li onClick={closeMenu}>
          <Link to="/">Home</Link>
        </li>
        <li onClick={closeMenu}>
          <Link to="/services">Services</Link>
        </li>
        <li onClick={closeMenu}>
          <Link to="/trips">Trips</Link>
        </li>
        <li onClick={closeMenu}>
          <Link to="/about">About</Link>
        </li>
        <Link to="/login" onClick={closeMenu}>
          <button className="LoginButton">Login</button>
        </Link>
      </ul>
    </>
  );
};

export default Navbar;
