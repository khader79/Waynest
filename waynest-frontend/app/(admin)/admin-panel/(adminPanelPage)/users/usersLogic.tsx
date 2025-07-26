const usersLogic = () => {
  const users = [
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

  const usersMap = users.map((user) => (
    <tr key={user.id}>
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
