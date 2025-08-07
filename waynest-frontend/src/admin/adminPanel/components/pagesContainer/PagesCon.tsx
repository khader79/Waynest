import "./PagesCon.css";

const PagesCon = ({ header, children }: any) => {
  return (
    <div className="Container">
      <div className="Header">
        <h1>{header}</h1>
      </div>
      {children}
    </div>
  );
};

export default PagesCon;
