"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { MdDelete } from "react-icons/md";

interface User {
  userid: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

const useUsersLogic = () => {
  const [users, setUsers] = useState<User[]>([]);
  const tableHeaders = ["Name", "Email", "Role", "Status"];

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
        name: "Khader",
        email: "khader6@gmail.com",
        password: "khader",
        role: "Admin",
        status: "Active",
      };

      const res = await axios.post(
        "http://localhost:3001/auth/check-email",
        newUser.email
      );
      if ((res.status = 409)) {
        alert("email already exist");
      } else {
        await axios.post("http://localhost:3001/users", newUser, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        await fetchUsers();
      }
    } catch (error) {
      console.error("Failed to add user:", error);
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
