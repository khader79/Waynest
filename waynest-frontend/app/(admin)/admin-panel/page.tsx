"use client";

import React, { useState } from "react";

const page = () => {
  //@ts-ignore
  const name = localStorage.getItem("name");
  //@ts-ignore
  const email = localStorage.getItem("email");
  return (
    <div>
      <h1>{name}</h1>
      <h2>{email}</h2>
    </div>
  );
};

export default page;
