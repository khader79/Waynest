"use client";

import { useEffect, useState } from "react";

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
    <div>
      <h1>{name}</h1>
      <h2>{email}</h2>
    </div>
  );
};

export default DashBoard;
