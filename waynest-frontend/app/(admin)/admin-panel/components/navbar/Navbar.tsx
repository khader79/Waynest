"use client";

import React from "react";
import { useOpenMenu } from "../../../../Context/openMenu";
import { GiHamburgerMenu } from "react-icons/gi";
import "./Navbar.css";

const Navbar = ({ className }: any) => {
  //@ts-ignore
  const { setOpen } = useOpenMenu();

  return (
    <nav className={className}>
      <GiHamburgerMenu />
    </nav>
  );
};

export default Navbar;
