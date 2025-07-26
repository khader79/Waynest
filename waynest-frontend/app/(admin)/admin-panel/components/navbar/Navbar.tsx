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
      <GiHamburgerMenu
        onClick={() => {
          setOpen(!open);
        }}
        className="hamburgerMenu"
      />
    </nav>
  );
};

export default Navbar;
