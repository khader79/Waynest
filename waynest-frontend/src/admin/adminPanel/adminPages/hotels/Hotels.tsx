import axios from "axios";
import { useEffect, useState } from "react";
import "./hotels.css";
import { Table } from "../../components/table/Table";
import PagesCon from "../../components/pagesContainer/PagesCon";
const Hotels = () => {
  type dataType = {
    id: string;
    name: string;
  };
  const [data, setData] = useState<dataType[]>([]);
  useEffect(() => {
    const token = localStorage.getItem("token");
    const res = axios
      .get("http://localhost:3001/hotels", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setData(res.data);
      });
  }, []);

  const headers = ["Hotel Name", "Name x2", "Name x3", "Name x4"];
  const tableHeaderMap = (
    <tr>
      {headers.map((tableHeader) => (
        <th>{tableHeader}</th>
      ))}
    </tr>
  );

  const datamap = data.map((data) => {
    return (
      <tr key={data.id}>
        <td>{data.name}</td>
        <td>{data.name}</td>
        <td>{data.name}</td>
        <td>{data.name}</td>
      </tr>
    );
  });
  return (
    <PagesCon header="Hotels">
      <Table headers={tableHeaderMap} data={datamap} />
    </PagesCon>
  );
};

export default Hotels;
