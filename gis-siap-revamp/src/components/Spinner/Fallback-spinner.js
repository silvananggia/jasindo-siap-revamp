// ** Logo
import logo from "../../assets/images/spinner/logo.png";
import "./app-loader.scss";
const SpinnerComponent = () => {
  return (
    <div className="fallback-spinner app-loader">
      <img className="fallback-logo" src={logo} alt="logo" width="150px" height="auto" />
      <div className="loading">
        <div className="effect-1 effects"></div>
        <div className="effect-2 effects"></div>
        <div className="effect-3 effects"></div>
      </div>
    </div>
  );
};

export default SpinnerComponent;
