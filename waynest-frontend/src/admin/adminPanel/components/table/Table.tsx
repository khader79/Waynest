import "./Table.css";
export const Table = ({ headers, data }: any) => {
  return (
    <div style={{ overflowX: "auto", width: "100%" }}>
      <table className="table">
        {headers}
        {data}
      </table>
    </div>
  );
};
