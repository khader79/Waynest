"use client";

import Link from "next/link";
import React, { useEffect } from "react";
import "./Footer.css";
import FooterLogic from "./FooterLogic";

const Footer = () => {
  const { hideFooter } = FooterLogic();

  if (hideFooter) return null;
  return (
    <>
      {
        <footer className="footer">
          <h1 className="footerLeft">
            <Link href="/">Waynest</Link>
          </h1>

          <ul className="footerRight">
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
          </ul>
        </footer>
      }
    </>
  );
};

export default Footer;
