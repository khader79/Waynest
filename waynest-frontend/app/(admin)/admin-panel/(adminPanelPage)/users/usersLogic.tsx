"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { MdDelete } from "react-icons/md";

const useUsersLogic = () => {
  const [users, setUsers] = useState([
    {
      userid: 0,
      name: "",
      email: "",
      role: "",
      status: "",
    },
  ]);
  const tableHeaders = ["Name", "Email", "Role", "Status", "Actions"];

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get("http://localhost:3001/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const addUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const newUser = {
        name: "Admin",
        email: "Admin13@gmail.com",
        password: "admin12",
        role: "Admin",
        status: "Active",
      };

      await axios.post("http://localhost:3001/auth/check-email", {
        email: newUser.email,
      });

      await axios.post("http://localhost:3001/users", newUser, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await fetchUsers();
    } catch (error: any) {
      if (error.response?.status === 409) {
        alert(error.response.data.message);
      } else {
        alert("Something went wrong. Please try again.");
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const tableHeaderMap = (
    <tr>
      {tableHeaders.map((header, index) => (
        <th key={index}>{header}</th>
      ))}
    </tr>
  );
  const deleteUserHandler = (id: number) => {
    axios.delete(`http://localhost:3001/users/${id}`);
    fetchUsers();
  };
  const usersMap = users.map((user) => (
    <tr key={user.userid}>
      <td>{user.name}</td>
      <td>{user.email}</td>
      <td>{user.role}</td>
      <td className={user.status}>{user.status}</td>
      <td>
        <MdDelete onClick={() => deleteUserHandler(user.userid)} />
      </td>
    </tr>
  ));

  return {
    usersMap,
    tableHeaderMap,
    addUserHandler: addUser,
  };
};

export default useUsersLogic;
