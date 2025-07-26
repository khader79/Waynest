"use client";

import React from "react";
import { useOpenMenu } from "../../../../Context/openMenu";
import { GiHamburgerMenu } from "react-icons/gi";
import "./Navbar.css";

const Navbar = ({ className }: any) => {
  //@ts-ignore
  const { open, setOpen } = useOpenMenu();

  return (
    <nav className={className}>
      <div className="navBarLeft">
        <GiHamburgerMenu
          onClick={() => {
            setOpen(!open);
          }}
          className="hamburgerMenu"
        />
        <h1>Waynest</h1>
      </div>
    </nav>
  );
};

export default Navbar;
