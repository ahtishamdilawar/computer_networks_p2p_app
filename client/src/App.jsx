import "./App.css";
import io from "socket.io-client";
import PeerConnection from "./peercomp";

function App() {
  const socket = io.connect("https://xvw8wsdz-3000.inc1.devtunnels.ms/");
  return (
    <div className="App">
      <PeerConnection />
    </div>
  );
}

export default App;
