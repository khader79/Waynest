"use client";

import axios from "axios";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

const usersLogic = () => {
  const [users, setUsers] = useState([]);

  const users1 = [
    {
      id: 1,
      name: "Ahmad Khalil",
      email: "ahmad.khalil@example.com",
      role: "Traveler",
      status: "Active",
    },
    {
      id: 2,
      name: "Sara Nasser",
      email: "sara.nasser@example.com",
      role: "Service Provider",
      status: "Pending",
    },
    {
      id: 3,
      name: "Omar Saleh",
      email: "omar.saleh@example.com",
      role: "Traveler",
      status: "Banned",
    },
    {
      id: 4,
      name: "Lina Darwish",
      email: "lina.darwish@example.com",
      role: "Admin",
      status: "Active",
    },
    {
      id: 5,
      name: "Tariq Zayed",
      email: "tariq.zayed@example.com",
      role: "Traveler",
      status: "Active",
    },
  ];
  const tableHeader = ["Name", "Email", "Role", "Status"];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      localStorage.removeItem("name");
      localStorage.removeItem("email");
      localStorage.removeItem("role");
      localStorage.removeItem("status");
      redirect("/admin-login");
    } else {
      const token = localStorage.getItem("token");
      axios
        .get("http://localhost:3001/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          setUsers(res.data);
        });
    }
  }, []);

  const usersMap = users.map((user: any) => (
    <tr key={user.userid}>
      <td>{user.name}</td>
      <td>{user.email}</td>
      <td>{user.role}</td>
      <td className={user.status}>{user.status}</td>
    </tr>
  ));

  const tableHeaderMap = (
    <tr>
      {tableHeader.map((header, index) => (
        <th key={index}>{header}</th>
      ))}
    </tr>
  );

  return { usersMap, tableHeaderMap };
};

export default usersLogic;
