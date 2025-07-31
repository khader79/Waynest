"use client";

import { useEffect, useState } from "react";
import AdminPanelMain from "./AdminPanelMain";

const DashBoard = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const storedName = localStorage.getItem("name");
    const storedEmail = localStorage.getItem("email");

    if (storedName) setName(storedName);
    if (storedEmail) setEmail(storedEmail);
  }, []);

  return (
    <AdminPanelMain>
      <div>
        <h1>{name}</h1>
        <h2>{email}</h2>
      </div>
    </AdminPanelMain>
  );
};

export default DashBoard;
