"use client";
import Link from "next/link";
import React from "react";
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
            <Link href="/">Waynest</Link>
          </h1>
        </div>
        <ul className="navRight">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href="/services">Services</Link>
          </li>
          <li>
            <Link href="/trips">Trips</Link>
          </li>
          <li>
            <Link href="/about">About</Link>
          </li>

          <Link href="/login">
            <button className="LoginButton">Login</button>
          </Link>
        </ul>
      </nav>

      <nav className="navbarMobile">
        <div className="navLeft">
          <h1>
            <Link href="/">Waynest</Link>
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
          <Link href="/">Home</Link>
        </li>
        <li onClick={closeMenu}>
          <Link href="/services">Services</Link>
        </li>
        <li onClick={closeMenu}>
          <Link href="/trips">Trips</Link>
        </li>
        <li onClick={closeMenu}>
          <Link href="/about">About</Link>
        </li>
        <Link href="/login" onClick={closeMenu}>
          <button className="LoginButton">Login</button>
        </Link>
      </ul>
    </>
  );
};

export default Navbar;
