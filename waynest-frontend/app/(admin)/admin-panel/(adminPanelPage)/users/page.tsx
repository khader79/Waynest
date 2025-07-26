import React from "react";
import usersLogic from "./usersLogic";
import "./users.css";
const page = () => {
  const { usersMap, tableHeaderMap } = usersLogic();
  return (
    <div className="usersContainer">
      <h1>Users </h1>
      <table className="userstable">
        <thead>{tableHeaderMap}</thead>
        <tbody>{usersMap}</tbody>
      </table>
    </div>
  );
};

export default page;
