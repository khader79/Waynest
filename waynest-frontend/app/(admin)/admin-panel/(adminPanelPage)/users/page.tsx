"use client";

import React from "react";
import usersLogic from "./usersLogic";
import "./users.css";

const Page = () => {
  const { usersMap, tableHeaderMap, addUserHandler } = usersLogic();

  return (
    <div className="usersContainer">
      <h1>Users</h1>
      <button onClick={addUserHandler}>Add User</button>
      <table className="userstable">
        <thead>{tableHeaderMap}</thead>

        <tbody>{usersMap}</tbody>
      </table>
    </div>
  );
};

export default Page;
