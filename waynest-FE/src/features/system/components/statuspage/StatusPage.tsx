import "./StatusPage.css";
interface StatusPageProps {
  title: string;
  subTitle: string;
  errorCode?: string | number;
  buttonText?: string;
  onButtonClick?: () => void;
  image?: string;
  errorcodeColor: string;
}

const StatusPage = ({
  title,
  subTitle,
  errorCode,
  buttonText = "Back Home",
  onButtonClick,
  errorcodeColor,
}: StatusPageProps) => {
  return (
    <div className="status-page-container container-center">
      {errorCode && <h1 className={errorcodeColor}>{errorCode}</h1>}
      <h2>{title}</h2>
      <p>{subTitle}</p>
      <button onClick={onButtonClick} className="btn-primary">
        {buttonText}
      </button>
    </div>
  );
};

export default StatusPage;
