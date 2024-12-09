import "./App.css";
import io from "socket.io-client";
import PeerConnection from "./peercomp";

function App() {
  
  return (
    <div className="App">
      <PeerConnection />
    </div>
  );
}

export default App;
